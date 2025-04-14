'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Image from '@tiptap/extension-image';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import Dropcursor from '@tiptap/extension-dropcursor';
import { Extension } from '@tiptap/core';
import { Plugin } from 'prosemirror-state';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const editorRef = useRef<any>(null);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const addImage = useCallback(() => {
    if (!imageUrl) {
      // Ask for the image URL if not provided
      const url = prompt('Enter the URL of the image:');
      if (url) {
        editorRef.current?.chain().focus().setImage({ src: url }).run();
      }
    } else {
      editorRef.current?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
  }, [imageUrl]);

  // Custom keyboard handler for "/" commands
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '/' && editorRef.current) {
      // Prevent default behavior
      e.preventDefault();
      
      // Show a simple popup menu with commands
      const menu = document.createElement('div');
      menu.className = 'slash-command-menu';
      menu.innerHTML = `
        <div class="slash-command-header">Insert</div>
        <button class="slash-command-item" data-command="h1">Heading 1</button>
        <button class="slash-command-item" data-command="h2">Heading 2</button>
        <button class="slash-command-item" data-command="h3">Heading 3</button>
        <button class="slash-command-item" data-command="bulletList">Bullet List</button>
        <button class="slash-command-item" data-command="orderedList">Ordered List</button>
        <button class="slash-command-item" data-command="image">Image</button>
      `;
      
      // Get the current cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the menu under the cursor
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        
        // Add the menu to the body
        document.body.appendChild(menu);
        
        // Add event listeners to buttons
        const buttons = menu.querySelectorAll('.slash-command-item');
        buttons.forEach(button => {
          button.addEventListener('click', () => {
            const command = (button as HTMLElement).dataset.command;
            if (command === 'h1') {
              editorRef.current.chain().focus().toggleHeading({ level: 1 }).run();
            } else if (command === 'h2') {
              editorRef.current.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (command === 'h3') {
              editorRef.current.chain().focus().toggleHeading({ level: 3 }).run();
            } else if (command === 'bulletList') {
              editorRef.current.chain().focus().toggleBulletList().run();
            } else if (command === 'orderedList') {
              editorRef.current.chain().focus().toggleOrderedList().run();
            } else if (command === 'image') {
              const url = prompt('Enter the URL of the image:');
              if (url) {
                editorRef.current.chain().focus().setImage({ src: url }).run();
              }
            }
            
            // Remove the menu after command execution
            document.body.removeChild(menu);
          });
        });
        
        // Close the menu when clicking outside
        const handleClickOutside = (e: MouseEvent) => {
          if (!menu.contains(e.target as Node)) {
            document.body.removeChild(menu);
            document.removeEventListener('click', handleClickOutside);
          }
        };
        
        // Add a small delay to prevent immediate triggering
        setTimeout(() => {
          document.addEventListener('click', handleClickOutside);
        }, 100);
      }
    }
  }, []);

  // Handler for dropping images
  const handleDrop = (view: any, event: DragEvent, slice: any, moved: boolean) => {
    if (!moved && event.dataTransfer) {
      const textData = event.dataTransfer.getData('text/plain');
      
      try {
        // Check if it's a screenshot from our tool
        const jsonData = JSON.parse(textData);
        
        if (jsonData && jsonData.type === 'screenshot' && jsonData.url) {
          const { schema } = view.state;
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          
          const node = schema.nodes.image.create({ 
            src: jsonData.url, 
            alt: `Screenshot`,
            style: jsonData.width ? `width: ${jsonData.width};` : ''
          });
          const transaction = view.state.tr.insert(coordinates.pos, node);
          
          view.dispatch(transaction);
          
          // Mark as used in the UI
          const customEvent = new CustomEvent('screenshotUsed', { 
            detail: { id: jsonData.id } 
          });
          window.dispatchEvent(customEvent);
          
          return true; // Handled
        }
      } catch (e) {
        // Not our JSON data, let TipTap handle it
        console.log('Not a screenshot drop');
      }
    }
    
    return false; // Not handled, let TipTap handle it
  };

  // Configure the editor with extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-md max-w-[33%] h-auto',
        },
        allowBase64: true,
      }),
      Dropcursor.configure({
        color: '#3b82f6',
        width: 2,
      }),
      Extension.create({
        addProseMirrorPlugins() {
          return [
            new Plugin({
              props: {
                handleDrop,
              },
            }),
          ];
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Get content as markdown instead of HTML
      const markdown = editor.storage.markdown.getMarkdown();
      onChange(markdown);
    },
    autofocus: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-primary prose-img:rounded-md focus:outline-none max-w-none',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      },
    },
  });

  // Update the editor reference whenever it changes
  if (editor) {
    editorRef.current = editor;
  }

  if (!editor) {
    return <div className="p-4 text-center">Loading editor...</div>;
  }

  return (
    <>
      {/* Editor UI */}
      <div className="h-full">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center p-2 gap-1 border-b bg-gray-50 sticky top-0 z-10">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
            className="data-[state=on]:bg-slate-200"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
            className="data-[state=on]:bg-slate-200"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          
          <div className="h-5 w-[1px] bg-slate-300 mx-1" />
          
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 1 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            aria-label="Heading 1"
            className="data-[state=on]:bg-slate-200"
          >
            <Heading1 className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Heading 2"
            className="data-[state=on]:bg-slate-200"
          >
            <Heading2 className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('heading', { level: 3 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            aria-label="Heading 3"
            className="data-[state=on]:bg-slate-200"
          >
            <Heading3 className="h-4 w-4" />
          </Toggle>
          
          <div className="h-5 w-[1px] bg-slate-300 mx-1" />
          
          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet List"
            className="data-[state=on]:bg-slate-200"
          >
            <List className="h-4 w-4" />
          </Toggle>
          
          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Ordered List"
            className="data-[state=on]:bg-slate-200"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          
          <div className="h-5 w-[1px] bg-slate-300 mx-1" />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={addImage}
            className="p-2 h-8"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Editor Content */}
        <div className="h-[calc(100%-3rem)] overflow-auto">
          <EditorContent 
            editor={editor} 
            className="h-full w-full" 
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      
      {/* Bubble Menu for selected text */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="bg-white shadow-md rounded-md flex overflow-hidden border border-gray-200"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-2 hover:bg-gray-100", 
              { "bg-gray-200": editor.isActive('bold') }
            )}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-2 hover:bg-gray-100", 
              { "bg-gray-200": editor.isActive('italic') }
            )}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "p-2 hover:bg-gray-100", 
              { "bg-gray-200": editor.isActive('heading', { level: 1 }) }
            )}
          >
            <Heading1 className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "p-2 hover:bg-gray-100", 
              { "bg-gray-200": editor.isActive('heading', { level: 2 }) }
            )}
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              "p-2 hover:bg-gray-100", 
              { "bg-gray-200": editor.isActive('heading', { level: 3 }) }
            )}
          >
            <Heading3 className="h-4 w-4" />
          </button>
        </BubbleMenu>
      )}

      <style jsx global>{`
        /* Editor Styles */
        .ProseMirror {
          height: 100%;
          outline: none;
          padding: 1.5rem 2rem;
        }
        
        /* Heading Styles */
        .ProseMirror h1 {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          color: #1f2937;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #374151;
        }
        
        /* Paragraph Styles */
        .ProseMirror p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        
        /* List Styles */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        
        /* Image Styles */
        .ProseMirror img {
          max-width: 33%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem auto;
          display: block;
        }
        
        /* Focus Styles */
        .ProseMirror:focus {
          outline: none;
        }
        
        /* Placeholder Styles */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }

        /* Slash Command Menu Styles */
        .slash-command-menu {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          min-width: 12rem;
          z-index: 100;
        }

        .slash-command-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          padding: 0.25rem 0.5rem;
          margin-bottom: 0.25rem;
        }

        .slash-command-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.5rem;
          font-size: 0.875rem;
          border-radius: 0.25rem;
          cursor: pointer;
        }

        .slash-command-item:hover {
          background-color: #f3f4f6;
        }
      `}</style>
    </>
  );
} 