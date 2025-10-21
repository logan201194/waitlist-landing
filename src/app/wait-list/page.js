'use client';
import { useState } from 'react';
import { Mail, Linkedin, Twitter, Facebook } from 'lucide-react';

export default function Home() {
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const body = {
      name: e.target.name.value,
      email: e.target.email.value,
    };
    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          🔥 Discovercro 
        </h1>

        {done ? (
          <p className="text-center text-emerald-600 flex items-center justify-center gap-2">
            <Mail className="w-5 h-5" /> Check your inbox—welcome email sent!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              placeholder="Your name"
              required
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-black/40 outline-none"
            />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-black/40 outline-none"
            />
            <button
              type="submit"
              className="w-full bg-black hover:bg-black/80 text-white rounded-lg py-3 font-medium transition"
            >
              Join wait-list
            </button>
          </form>
        )}

        {/* --- Social links --- */}
        <div className="mt-6 flex justify-center gap-6 text-slate-600">
          <a href="https://linkedin.com/in/logan-a-b42a71383" target="_blank">
            <Linkedin className="w-5 h-5 hover:text-black transition" />
          </a>
          <a href="https://x.com/logan201194" target="_blank">
            <Twitter className="w-5 h-5 hover:text-black transition" />
          </a>
          <a href="https://www.facebook.com/profile.php?id=61581583184801" target="_blank">
            <Facebook className="w-5 h-5 hover:text-black transition" />
          </a>
        </div>
      </div>
    </main>
  );
}