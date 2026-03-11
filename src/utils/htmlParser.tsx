import React from 'react';
import parse, { type HTMLReactParserOptions } from 'html-react-parser';
import DOMPurify from 'dompurify';

/**
 * Parses HTML string safely and replaces occurrences of '____' with custom React components.
 * 
 * @param html The raw HTML string.
 * @param renderBlank A callback that returns a React node for the i-th blank (0-indexed).
 */
export function parseHTMLWithBlanks(html: string, renderBlank?: (index: number) => React.ReactNode): React.ReactNode {
  if (!html) return null;

  // Sanitize HTML to prevent XSS
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
  });

  if (!renderBlank) {
    // If no blank replacer provided, just parse it safely
    return parse(cleanHtml);
  }

  let blankIndex = 0;

  const options: HTMLReactParserOptions = {
    replace: (domNode: any) => {
      // Find text nodes that contain '____'
      if (domNode.type === 'text' && domNode.data && domNode.data.includes('____')) {
        const parts = domNode.data.split('____');
        return (
          <React.Fragment>
            {parts.map((part: string, i: number) => {
              // The last part does not have a trailing blank
              if (i === parts.length - 1) {
                return <React.Fragment key={i}>{part}</React.Fragment>;
              }

              const currentIdx = blankIndex++;
              return (
                <React.Fragment key={i}>
                  {part}
                  {/* Inline wrapper so it flows inline with text */}
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 4px' }}>
                    {renderBlank(currentIdx)}
                  </span>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      }
    },
  };

  return parse(cleanHtml, options);
}

/**
 * Parses simple HTML string safely without any replacement.
 */
export function parseHTML(html: string): React.ReactNode {
  if (!html) return null;
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
  });
  return parse(cleanHtml);
}
