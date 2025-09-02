'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`} style={{ lineHeight: '1.0' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize how different markdown elements are rendered - Zero spacing
          p: ({ children }) => <p className="mb-0 last:mb-0 leading-tight">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-0 space-y-0">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-0 space-y-0">{children}</ol>,
          li: ({ children }) => <li className="leading-tight mb-0">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">
                {children}
              </code>
            ) : (
              <code className="block bg-gray-100 p-2 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto mb-0">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <div className="mb-0">{children}</div>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-0">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold mb-0 mt-0.5 first:mt-0 text-gray-900">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-0 mt-0.5 first:mt-0 text-gray-900">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-0 mt-0.5 first:mt-0 text-gray-900">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-bold mb-0 mt-0.5 first:mt-0 text-gray-900">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-bold mb-0 mt-0.5 first:mt-0 text-gray-900">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-bold mb-0 mt-0.5 first:mt-0 text-gray-900">{children}</h6>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-0">
              <table className="min-w-full border border-gray-300">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-300 last:border-r-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
