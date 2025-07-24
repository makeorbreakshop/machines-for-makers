"""
Multi-modal OpenAI mapper that uses both text and vision analysis for better feature detection
"""
import json
import logging
import base64
import requests
from typing import Dict, Optional, Tuple, List
from openai import OpenAI
from config import OPENAI_API_KEY
from .openai_mapper import OpenAIMapper

logger = logging.getLogger(__name__)


class MultiModalOpenAIMapper(OpenAIMapper):
    """Enhanced mapper that uses both text and vision analysis for feature detection"""
    
    def __init__(self):
        super().__init__()
        self.vision_model = "gpt-4o"  # GPT-4o has vision capabilities
        logger.info(f"Multi-modal OpenAI mapper initialized with vision model: {self.vision_model}")
    
    def encode_image_from_url(self, image_url: str) -> Optional[str]:
        """Download and encode image to base64"""
        try:
            # Handle protocol-relative URLs
            if image_url.startswith('//'):
                image_url = f'https:{image_url}'
            
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Encode to base64
            return base64.b64encode(response.content).decode('utf-8')
        except Exception as e:
            logger.warning(f"Failed to encode image {image_url}: {str(e)}")
            return None
    
    def analyze_product_images(self, images: List[str]) -> Dict:
        """Use GPT-4 Vision to analyze product images for features"""
        if not images:
            return {}
        
        # Take up to 3 images to avoid token limits
        selected_images = images[:3]
        
        # Encode images
        encoded_images = []
        for img_url in selected_images:
            encoded = self.encode_image_from_url(img_url)
            if encoded:
                encoded_images.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encoded}",
                        "detail": "low"  # Use low detail to save tokens
                    }
                })
        
        if not encoded_images:
            logger.warning("No images could be encoded for vision analysis")
            return {}
        
        try:
            # Create message content with images
            message_content = [
                {
                    "type": "text",
                    "text": """Analyze these laser cutter/engraver product images and identify the following features:

1. **Enclosure**: Does the machine have a protective enclosure/housing around the work area?
2. **Air Assist**: Can you see air assist nozzles, tubes, or pumps for blowing air at the cutting point?
3. **Camera**: Are there any cameras visible for material positioning or monitoring?
4. **Rotary Attachment**: Can you see or identify mounting points for rotary attachments?
5. **Passthrough**: Does the machine have openings/slots for feeding long materials through?
6. **WiFi/Connectivity**: Any visible antennas, network indicators, or connectivity features?

Return your analysis as JSON with boolean values (true/false) for each feature you can visually confirm:
```json
{
  "enclosure": true/false,
  "air_assist": true/false, 
  "camera": true/false,
  "rotary": true/false,
  "passthrough": true/false,
  "wifi": true/false
}
```

Only mark as true if you can clearly see visual evidence of the feature in the images."""
                }
            ]
            
            # Add all encoded images
            message_content.extend(encoded_images)
            
            response = self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": message_content
                    }
                ],
                max_tokens=500,
                temperature=0
            )
            
            # Extract JSON from response
            response_text = response.choices[0].message.content
            
            # Try to extract JSON
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                # Look for JSON-like content
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_text = response_text[json_start:json_end] if json_start != -1 else "{}"
            
            vision_analysis = json.loads(json_text)
            logger.info(f"Vision analysis completed: {vision_analysis}")
            return vision_analysis
            
        except Exception as e:
            logger.error(f"Vision analysis failed: {str(e)}")
            return {}
    
    def map_to_database_schema(self, scrapfly_data: Dict) -> Tuple[Dict, List[str]]:
        """
        Enhanced mapping that combines text analysis with vision analysis
        """
        # First, do the standard text-based mapping
        text_mapped_data, warnings = super().map_to_database_schema(scrapfly_data)
        
        # Extract images for vision analysis
        images = []
        if 'images' in scrapfly_data:
            for img in scrapfly_data['images']:
                if isinstance(img, str):
                    images.append(img)
                elif isinstance(img, dict) and 'url' in img:
                    images.append(img['url'])
        
        # Perform vision analysis if images available
        vision_features = {}
        if images:
            logger.info(f"Performing vision analysis on {len(images)} images")
            vision_features = self.analyze_product_images(images)
        
        # Combine text and vision analysis
        combined_data = text_mapped_data.copy()
        enhanced_warnings = warnings.copy()
        
        # For each feature, prefer vision analysis if available and confident
        feature_mapping = {
            'enclosure': 'enclosure',
            'air_assist': 'air_assist', 
            'camera': 'camera',
            'rotary': 'rotary',
            'passthrough': 'passthrough',
            'wifi': 'wifi'
        }
        
        for vision_key, db_key in feature_mapping.items():
            if vision_key in vision_features:
                vision_value = "Yes" if vision_features[vision_key] else "No"
                text_value = combined_data.get(db_key)
                
                if text_value != vision_value:
                    enhanced_warnings.append(f"Vision analysis ({vision_value}) differs from text analysis ({text_value}) for {db_key}")
                
                # Use vision analysis result
                combined_data[db_key] = vision_value
                logger.info(f"Enhanced {db_key} with vision analysis: {vision_value}")
        
        return combined_data, enhanced_warnings
    
    def _build_mapping_prompt(self, scrapfly_data: Dict) -> str:
        """Enhanced prompt with better feature detection instructions"""
        base_prompt = super()._build_mapping_prompt(scrapfly_data)
        
        enhanced_instructions = """
ENHANCED FEATURE DETECTION:
8. Look for feature variations and context clues:
   - Air Assist: "air assist", "air-assist", "air assistance", "C4 Air Assist", "air pump"
   - Passthrough: "pass-through", "passthrough", "pass through", "door design", "oversized materials"  
   - Rotary: "rotary attachment", "rotary axis", "rotary roller", "M3 Rotary", "4-pin aviation port"
   - Enclosure: "enclosure", "enclosed", "housing", "protective cover", "safety enclosure"
   - Internet: "WiFi", "Wi-Fi", "wireless", "internet", "USB/Wi-Fi", "network"
9. Check product accessories and compatibility lists for feature hints
10. Look in specifications tables, FAQ sections, and product descriptions"""
        
        return base_prompt + enhanced_instructions


def create_multimodal_openai_mapper() -> MultiModalOpenAIMapper:
    """Factory function to create multi-modal OpenAI mapper"""
    return MultiModalOpenAIMapper()