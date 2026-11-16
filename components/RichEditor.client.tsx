'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { IAllProps as TinyMCEProps } from '@tinymce/tinymce-react';
import { cloudinaryVideoPoster, uploadMedia } from '@/lib/upload-client';
const productTemplate = `
<h2>Tên sản phẩm | Giải pháp tối ưu cho sản xuất</h2>

<p>
Giới thiệu tổng quan về sản phẩm. Mô tả vấn đề khách hàng đang gặp phải,
vai trò của thiết bị trong quy trình sản xuất và những lợi ích nổi bật mà máy mang lại.
</p>

<p>
Máy được thiết kế với kết cấu chắc chắn, khả năng vận hành ổn định,
phù hợp cho các cơ sở sản xuất, nhà máy và doanh nghiệp cần nâng cao năng suất.
</p>

<hr />

<h2>Vì sao nên sử dụng máy?</h2>

<p>
So với phương pháp truyền thống, máy mang lại nhiều ưu điểm vượt trội:
</p>

<ul>
  <li>Tăng năng suất sản xuất.</li>
  <li>Giảm thời gian xử lý.</li>
  <li>Tiết kiệm chi phí nhân công.</li>
  <li>Đảm bảo chất lượng sản phẩm đồng đều.</li>
  <li>Vận hành đơn giản, dễ sử dụng.</li>
</ul>

<p>
Thiết bị phù hợp cho các cơ sở sản xuất chuyên nghiệp cần giải pháp ổn định và hiệu quả.
</p>

<hr />

<h2>Máy có thể xử lý những nguyên liệu nào?</h2>

<p>
Thiết bị có khả năng xử lý nhiều loại nguyên liệu khác nhau:
</p>

<h3>Ngành thực phẩm</h3>

<ul>
  <li>Nguyên liệu thực phẩm.</li>
  <li>Nông sản.</li>
  <li>Gia vị.</li>
  <li>Sản phẩm dạng khô hoặc dạng ướt.</li>
</ul>

<h3>Ngành công nghiệp khác</h3>

<ul>
  <li>Nguyên liệu sản xuất.</li>
  <li>Hóa chất.</li>
  <li>Vật liệu công nghiệp.</li>
</ul>

<hr />

<h2>Ứng dụng thực tế</h2>

<p>
Máy được ứng dụng rộng rãi trong nhiều lĩnh vực:
</p>

<h3>Ngành thực phẩm</h3>

<ul>
  <li>Sản xuất và chế biến thực phẩm.</li>
  <li>Nhà máy chế biến nông sản.</li>
  <li>Cơ sở sản xuất vừa và nhỏ.</li>
</ul>

<h3>Ngành mỹ phẩm</h3>

<ul>
  <li>Sản xuất mỹ phẩm.</li>
  <li>Gia công nguyên liệu.</li>
</ul>

<h3>Ngành công nghiệp</h3>

<ul>
  <li>Dây chuyền sản xuất công nghiệp.</li>
  <li>Xưởng gia công chuyên nghiệp.</li>
</ul>

<hr />

<h2>Nguyên lý hoạt động</h2>

<p>
Mô tả nguyên lý hoạt động của máy.
Quá trình vận hành giúp xử lý nguyên liệu nhanh chóng,
ổn định và đảm bảo chất lượng đầu ra.
</p>

<ol>
  <li>Chuẩn bị nguyên liệu.</li>
  <li>Đưa nguyên liệu vào máy.</li>
  <li>Máy thực hiện quá trình xử lý.</li>
  <li>Thu thành phẩm sau khi hoàn thành.</li>
</ol>

<hr />

<h2>Ưu điểm nổi bật</h2>

<h3>Thiết kế chắc chắn</h3>

<p>
Máy sử dụng vật liệu chất lượng cao, kết cấu bền bỉ,
phù hợp với môi trường sản xuất công nghiệp.
</p>

<h3>Hiệu suất hoạt động cao</h3>

<p>
Động cơ mạnh mẽ giúp máy vận hành ổn định,
đáp ứng nhu cầu sản xuất liên tục.
</p>

<h3>Dễ dàng vệ sinh và bảo trì</h3>

<p>
Thiết kế tối ưu giúp người dùng dễ dàng vệ sinh,
bảo dưỡng và thay thế linh kiện khi cần thiết.
</p>

<hr />

<h2>Thông số kỹ thuật</h2>

<table>
  <thead>
    <tr>
      <th>Thông số</th>
      <th>Giá trị</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>Model</td>
      <td></td>
    </tr>

    <tr>
      <td>Công suất</td>
      <td></td>
    </tr>

    <tr>
      <td>Điện áp</td>
      <td></td>
    </tr>

    <tr>
      <td>Kích thước</td>
      <td></td>
    </tr>

    <tr>
      <td>Trọng lượng</td>
      <td></td>
    </tr>

    <tr>
      <td>Vật liệu</td>
      <td></td>
    </tr>
  </tbody>
</table>

<p><em>
Thông số được tổng hợp từ dữ liệu sản phẩm MCBrother.
</em></p>

<hr />

<h2>Hướng dẫn sử dụng</h2>

<ol>
  <li>Kiểm tra máy trước khi vận hành.</li>
  <li>Kết nối nguồn điện phù hợp.</li>
  <li>Cài đặt thông số theo nhu cầu sử dụng.</li>
  <li>Đưa nguyên liệu vào máy.</li>
  <li>Vệ sinh máy sau khi hoàn thành.</li>
</ol>

<hr />

<h2>Hướng dẫn vệ sinh và bảo dưỡng</h2>

<ul>
  <li>Vệ sinh máy sau mỗi lần sử dụng.</li>
  <li>Kiểm tra các bộ phận hoạt động định kỳ.</li>
  <li>Không vận hành máy vượt công suất.</li>
  <li>Thay thế linh kiện khi có dấu hiệu hao mòn.</li>
</ul>

<hr />

<h2>Câu hỏi thường gặp</h2>

<h3>Máy phù hợp với những doanh nghiệp nào?</h3>

<p>
Máy phù hợp với cơ sở sản xuất thực phẩm,
nhà máy công nghiệp và các doanh nghiệp cần nâng cao năng suất.
</p>

<h3>Máy có thể hoạt động liên tục không?</h3>

<p>
Có. Thiết bị được thiết kế để đáp ứng nhu cầu vận hành ổn định trong sản xuất.
</p>

<h3>Máy có dễ sử dụng không?</h3>

<p>
Có. Người vận hành chỉ cần thực hiện các bước cài đặt cơ bản là có thể sử dụng.
</p>

<hr />

<h2>Vì sao nên chọn MCBrother?</h2>

<ul>
  <li>Tư vấn lựa chọn máy phù hợp với nhu cầu.</li>
  <li>Hỗ trợ kỹ thuật trong quá trình sử dụng.</li>
  <li>Cung cấp giải pháp máy móc đồng bộ.</li>
  <li>Đảm bảo chất lượng và dịch vụ sau bán hàng.</li>
</ul>

<hr />

<h2>Liên hệ tư vấn và báo giá</h2>

<p>
Nếu Quý khách cần tư vấn lựa chọn thiết bị hoặc nhận báo giá,
đội ngũ MCBrother luôn sẵn sàng hỗ trợ.
</p>

<p>
  <strong>Hotline / Zalo:</strong>
  <a href="tel:0834551888">
    0834 551 888
  </a>
</p>

<p>
  <strong>Email:</strong>
  <a href="mailto:mcbrother2013@gmail.com">
    mcbrother2013@gmail.com
  </a>
</p>

<p>
  <strong>Website:</strong>
  <a href="https://mcbrother.com.vn" target="_blank" rel="noopener">
    mcbrother.com.vn
  </a>
</p>
`;
const TinyMCEEditor = dynamic<TinyMCEProps>(
  () =>
    import('@tinymce/tinymce-react').then(
      (m) => m.Editor as unknown as React.ComponentType<TinyMCEProps>
    ),
  { ssr: false }
);

export default function RichEditorClient({
  apiKey,
  name,
  value = '',
  onChange,
  height = 400,
  placeholder = 'Viết nội dung...',
  className,
  id,
}: any) {
  const [content, setContent] = React.useState(value);

  React.useEffect(() => {
    setContent(value ?? '');
  }, [value]);

  return (
    <div className={className}>
      {name && <input type="hidden" name={name} value={content} />}

      <TinyMCEEditor
        id={id || 'editor'}
        apiKey={apiKey}
        value={content}
        init={{
          height,
          menubar: false,

          /* 🔥 ADD TABLE */
          plugins: ['lists', 'link', 'image', 'table', 'code'],

          toolbar: `
            undo redo |
            h2 h3 |
            bold italic |
            bullist numlist |
            link image videoupload |
            table |
            block
          `,

          /* 🔥 TABLE CONFIG */
          table_default_attributes: {
            border: '1',
          },
          table_default_styles: {
            width: '100%',
            borderCollapse: 'collapse',
          },

          /* ================= IMAGE ================= */

          automatic_uploads: true,
          paste_data_images: true,
          image_dimensions: false,

          images_upload_handler: async (blobInfo, progress) => {
            const blob = blobInfo.blob();
            const file = new File([blob], blobInfo.filename() || 'image.jpg', { type: blob.type || 'image/jpeg' });
            return uploadMedia(file, { kind: 'image', folder: 'mcbrother/content', onProgress: progress });
          },

          /* ===== MEDIA LIBRARY ===== */
          file_picker_callback: async (callback) => {
            const res = await fetch('/api/media');
            const data = await res.json();

            if (!data.ok) return alert('Không tải được thư viện ảnh');

            const html = data.images
              .map(
                (img: any) => `
                  <img src="${img.thumb}" data-url="${img.url}"
                    style="width:100px;height:100px;object-fit:cover;margin:5px;cursor:pointer;border-radius:6px;" />
                `
              )
              .join('');

            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';

            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.background = '#fff';
            modal.style.padding = '16px';
            modal.style.borderRadius = '10px';
            modal.style.zIndex = '9999';
            modal.style.maxHeight = '80vh';
            modal.style.overflow = 'auto';

            modal.appendChild(container);
            document.body.appendChild(modal);

            container.querySelectorAll('img').forEach((img) => {
              img.addEventListener('click', () => {
                const url = img.getAttribute('data-url');

                if (url) {
                  callback(url, { alt: '' });
                  modal.remove();
                }
              });
            });
          },

          /* 🔥 FIX: CHO PHÉP TABLE */
          // valid_elements: `
          //   h2,h3,p,strong,em,ul,ol,li,
          //   a[href|target],
          //   img[src|alt],
          //   div[class],
          //   table,tr,td,th,thead,tbody
          // `,

          // valid_styles: { '*': '' },

          content_style: `
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ddd; padding: 8px; }
          `,
          placeholder,

          setup: (editor) => {

            /* ===== Nút tải video lên & chèn vào bài ===== */
            editor.ui.registry.addButton('videoupload', {
              icon: 'embed',
              tooltip: 'Tải video lên & chèn',
              onAction: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.onchange = async () => {
                  const f = input.files?.[0];
                  if (!f) return;
                  const note = editor.notificationManager.open({ text: `Đang tải video ${f.name}…`, type: 'info', progressBar: true });
                  try {
                    const url = await uploadMedia(f, { kind: 'video', folder: 'mcbrother/videos', onProgress: (p) => note.progressBar.value(p) });
                    const poster = cloudinaryVideoPoster(url) || '';
                    editor.insertContent(
                      `<p><video controls preload="metadata" src="${url}"${poster ? ` poster="${poster}"` : ''} width="100%"></video></p>`
                    );
                    note.close();
                    editor.notificationManager.open({ text: 'Đã chèn video. Nếu chưa xem được ngay, đợi vài phút để hệ thống tối ưu video.', type: 'success', timeout: 6000 });
                  } catch (e: any) {
                    note.close();
                    editor.notificationManager.open({ text: e?.message || 'Tải video thất bại', type: 'error', timeout: 6000 });
                  }
                };
                input.click();
              },
            });

            editor.ui.registry.addMenuButton('block', {
              text: 'Chèn nhanh',
              fetch: (callback) => {
                callback([
                  {
                    type: 'menuitem',
                    text: 'Template sản phẩm',
                    onAction: () => {
                      editor.insertContent(productTemplate);
                    }
                  },
                  {
                    type: 'menuitem',
                    text: 'Nút CTA',
                    onAction: () => {
                      editor.insertContent(`
                        <div class="cta-box">
                          <p><strong>Cần tư vấn máy?</strong></p>
                          <a href="/lien-he">Nhận báo giá</a>
                        </div>
                      `);
                    }
                  },

                  {
                    type: 'menuitem',
                    text: 'Ghi chú',
                    onAction: () => {
                      editor.insertContent(`
                        <div class="highlight">
                          Nội dung quan trọng...
                        </div>
                      `);
                    }
                  },

                  {
                    type: 'menuitem',
                    text: 'Cảnh báo',
                    onAction: () => {
                      editor.insertContent(`
                        <div class="warning-box">
                          ⚠ Lưu ý quan trọng...
                        </div>
                      `);
                    }
                  },

                  {
                    type: 'menuitem',
                    text: 'Chèn sản phẩm',
                    onAction: async () => {
                      const res = await fetch('/api/admin/products');
                      const data = await res.json();

                      if (!data.ok) return alert('Không tải được sản phẩm');

                      const html = data.products
                        .map(
                          (p: any) => `
                          <div style="cursor:pointer">
                            <img src="${p.coverImage || ''}"
                              style="width:100%;height:90px;object-fit:cover;border-radius:6px" />
                            <p style="font-size:12px;margin-top:4px">${p.name}</p>
                          </div>
                        `
                        )
                        .join('');

                      const container = document.createElement('div');
                      container.innerHTML = html;
                      container.style.display = 'grid';
                      container.style.gridTemplateColumns = 'repeat(4,1fr)';
                      container.style.gap = '10px';

                      const modal = document.createElement('div');
                      modal.style.position = 'fixed';
                      modal.style.top = '50%';
                      modal.style.left = '50%';
                      modal.style.transform = 'translate(-50%, -50%)';
                      modal.style.background = '#fff';
                      modal.style.padding = '16px';
                      modal.style.borderRadius = '10px';
                      modal.style.zIndex = '9999';
                      modal.style.maxHeight = '80vh';
                      modal.style.overflow = 'auto';

                      modal.appendChild(container);
                      document.body.appendChild(modal);

                      container.querySelectorAll('div').forEach((el, i) => {
                        el.addEventListener('click', () => {
                          const p = data.products[i];

                          editor.insertContent(`
                            <div class="product-box">
                              ${p.coverImage ? `<img src="${p.coverImage}" />` : ''}
                              <p><strong>${p.name}</strong></p>
                              <a href="/san-pham/${p.slug}">Xem chi tiết</a>
                            </div>
                          `);

                          modal.remove();
                        });
                      });
                    }
                  },

                ]);
              }
            });

          }
        }}
        onEditorChange={(html) => {
          setContent(html);
          onChange?.(html);
        }}
      />
    </div>
  );
}