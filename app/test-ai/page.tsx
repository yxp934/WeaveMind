'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestAIPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testConnection = async () => {
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message || 'Hello, can you hear me?' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to connect');
      }

      // Read the streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullResponse += chunk;
          setResponse(fullResponse);
        }
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AI Gateway Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <label className="block text-sm font-medium mb-2">Test Message</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a test message (optional)"
            className="w-full px-3 py-2 border rounded-md mb-4"
          />
          
          <Button 
            onClick={testConnection} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {response && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Response</h3>
            <div className="text-green-900 whitespace-pre-wrap">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}

