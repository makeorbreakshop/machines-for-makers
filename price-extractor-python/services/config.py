from typing import Dict, Any

class Config:
    """Configuration management for the price extractor."""
    
    def __init__(self, config_dict: Dict[str, Any]):
        self.config = config_dict
        
        # Set default values if not provided
        self.extraction_config = self.config.get('extraction', {})
        self.min_confidence = self.extraction_config.get('min_confidence', 0.8)
        self.price_change_threshold = self.extraction_config.get('price_change_threshold', 0.5)
        self.retry_attempts = self.extraction_config.get('retry_attempts', 3)
        
        # Database configuration
        self.db_config = self.config.get('database', {})
        self.connection_string = self.db_config.get('connection_string', None)
        
    @property
    def extraction_settings(self) -> Dict[str, Any]:
        """Get extraction-related settings."""
        return {
            'min_confidence': self.min_confidence,
            'price_change_threshold': self.price_change_threshold,
            'retry_attempts': self.retry_attempts
        }
        
    @property
    def database_settings(self) -> Dict[str, Any]:
        """Get database-related settings."""
        return {
            'connection_string': self.connection_string
        } 