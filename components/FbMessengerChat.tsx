'use client';

import { useEffect } from 'react';

const PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID;         // VD: '123456789012345'
const LOCALE = process.env.NEXT_PUBLIC_FB_LOCALE || 'vi_VN'; // 'vi_VN' hoặc 'en_US'
const THEME_COLOR = '#0A7282'; // tuỳ chọn, màu nút chat

export default function FbMessengerChat() {
  useEffect(() => {
    // Không chạy nếu thiếu PAGE_ID
    if (!PAGE_ID) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('FbMessengerChat: Missing NEXT_PUBLIC_FB_PAGE_ID');
      }
      return;
    }

    // Tránh inject nhiều lần
    if (document.getElementById('fb-root')) return;

    // Tạo fb-root
    const fbRoot = document.createElement('div');
    fbRoot.id = 'fb-root';
    document.body.appendChild(fbRoot);

    // Tạo chatbox
    const chatbox = document.createElement('div');
    chatbox.className = 'fb-customerchat';
    chatbox.setAttribute('attribution', 'biz_inbox');
    chatbox.setAttribute('page_id', PAGE_ID);
    chatbox.setAttribute('theme_color', THEME_COLOR);
    // 'show' để pop-up lời chào, 'hide' để ẩn
    chatbox.setAttribute('greeting_dialog_display', 'hide');
    document.body.appendChild(chatbox);

    // Inject SDK
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://connect.facebook.net/${LOCALE}/sdk/xfbml.customerchat.js`;
    s.onload = () => {
      // @ts-ignore
      if (window.FB) {
        // @ts-ignore
        window.FB.init({
          xfbml: true,
          version: 'v20.0',
        });
      }
    };
    document.body.appendChild(s);

    // Cleanup nếu page unmount (thường không cần, nhưng để gọn gàng)
    return () => {
      // không xoá fb-root/chatbox để tránh HMR gây lỗi widget
    };
  }, []);

  return null;
}
