'use client';

import { useState } from 'react';

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export default function ContactForm({ page }: { page?: string }) {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', subject: '', message: ''
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setOk(null); setMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, page }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setOk(true);
        setMsg('Đã gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm.');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setOk(false);
        setMsg('Gửi thất bại. Vui lòng kiểm tra thông tin hoặc thử lại sau.');
      }
    } catch (err) {
      setOk(false);
      setMsg('Có lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Họ tên *</label>
        <input
          className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
          minLength={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Điện thoại</label>
          <input
            className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="098x xxx xxx"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Chủ đề</label>
        <input
          className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
          value={form.subject}
          onChange={e => setForm({ ...form, subject: e.target.value })}
          placeholder="Báo giá, tư vấn sản phẩm..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nội dung *</label>
        <textarea
          className="w-full rounded-xl border px-3 py-2 h-32 focus:outline-none focus:ring"
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          required
          minLength={10}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
      >
        {loading ? 'Đang gửi...' : 'Gửi liên hệ'}
      </button>

      {ok === true && <p className="text-green-600 text-sm">{msg}</p>}
      {ok === false && <p className="text-red-600 text-sm">{msg}</p>}
    </form>
  );
}
