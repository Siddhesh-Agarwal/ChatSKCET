"use client";

import { useState } from 'react';
import { Send, Bot, User, University, Link } from 'lucide-react';
import generateResponse from './ai';
import type { Message, SearchResult } from './types';
import { hash } from 'crypto';

function Reference({ url, title, snippet }: SearchResult) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className='flex px-1 py-0.5 max-w-xs w-full border rounded-md gap-1 hover:bg-gray-200 transition-colors'
    >
      <Link size={30} className='border bg-gray-100 p-1 rounded' />
      <div className="flex flex-col">
        <h2 className='text-sm font-semibold line-clamp-1 overflow-ellipsis'>{title}</h2>
        <h3 className='text-xs line-clamp-1 overflow-ellipsis'>{snippet}</h3>
      </div>
    </a>
  )
}

function BotMessage({ message, references }: { message: string, references?: SearchResult[] }) {
  return (
    <div
      className='flex flex-col justify-start'
    >
      <div className="flex gap-2">

        <Bot className="mt-1 flex-shrink-0 border rounded-full bg-blue-100" size={24} />
        <div
          className='flex max-w-[85%] px-4 py-2 rounded-2xl bg-muted rounded-tl-none items-start gap-3 border bg-blue-100'
        >
          <div className="text-sm leading-relaxed whitespace-pre-line">
            {message}
          </div>
        </div>
      </div>
      {references && references.length > 0 && (
        <div className="flex overflow-x-scroll mt-1.5 gap-2">
          {
            references.map((reference) => (
              <Reference key={hash('sha256', JSON.stringify(reference))} {...reference} />
            ))
          }
        </div>
      )}
    </div>
  )
}

function UserMessage({ message }: { message: string }) {
  return (
    <div
      className='flex justify-end gap-2'
    >
      <div
        className='flex max-w-[85%] px-4 py-2 rounded-2xl bg-primary text-primary-foreground rounded-tr-none ml-auto border bg-orange-100'
      >
        <div className="text-sm leading-relaxed whitespace-pre-line">
          {message}
        </div>
      </div>
      <User className="h-6 w-6 mt-1 flex-shrink-0 border rounded-full bg-orange-100" />
    </div>
  )
}


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your guide to Sri Krishna College of Engineering and Technology. How can I help you today?',
      role: 'assistant',
      references: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (!input.trim()) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        content: input,
        role: 'user',
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      // Simulate AI response
      const response = await generateResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        references: response.references,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b px-4">
        <div className="container flex items-center gap-2 h-16">
          <University className="h-6 w-6" />
          <h1 className="text-xl font-bold">ChatSKCET</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="container max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            message.role === 'user' ? (
              <UserMessage key={message.id} message={message.content} />
            ) : (
              <BotMessage key={message.id} message={message.content} references={message.references} />
            )
          ))}
          {error && (
            <div className='bg-red-200 border-red-500 text-red-500 border px-2 py-1 rounded-md my-2'>
              <h2 className='font-semibold text-md mb-1'>Refresh the page and try again.</h2>
              <p className='text-sm'>{error}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t p-4">
        <div className="container max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            placeholder="Ask about SKCET..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-2 rounded-lg bg-muted border"
            autoFocus
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-lg bg-sky-300 text-primary-foreground hover:bg-sky-300/75 hover:cursor-pointer transition-colors border disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-75"
            disabled={!loading && !input.trim()}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}


