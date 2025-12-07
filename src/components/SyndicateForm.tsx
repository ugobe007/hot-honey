import React, { useState } from 'react';
import { startups } from './data/startupData';
import { API_BASE } from '@/lib/apiConfig';

const SyndicateForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/syndicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        setStatus('Syndicate created successfully!');
        setName('');
        setDescription('');
      } else {
        setStatus('Failed to create syndicate.');
      }
    } catch (error) {
      console.error(error);
      setStatus('An error occurred while creating syndicate.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Create a Syndicate</h2>
      <div>
        <label className="block mb-1 font-semibold">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-3 py-2 w-full rounded"
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-semibold">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border px-3 py-2 w-full rounded"
          required
        />
      </div>
      <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">
        Create Syndicate
      </button>
      <p className="text-sm text-gray-700">{status}</p>
    </form>
  );
};

export default SyndicateForm;
