// app/admin/products/new/page.tsx
import { prisma } from '@/lib/prisma';
import { createProduct } from '../actions';
import Link from 'next/link';
import RichEditor from '@/components/RichEditor';
import Script from 'next/script';
import ImageField from '@/components/ImageField';
import ProductImagesField from '@/components/ProductImagesField';
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tạo sản phẩm</h1>
        <Link
          href="/admin/products"
          className="px-3 py-2 text-[15px] rounded bg-gray-100 hover:bg-gray-200"
        >
          ← Quay lại
        </Link>
      </div>

      <form id="productForm" action={createProduct} className="grid gap-6 md:grid-cols-3">
        {/* Cột trái: Thông tin cơ bản */}
        <section className="md:col-span-2 space-y-6">
          {/* Card 1: Thông tin chung */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">Thông tin chung</div>
            <div className="p-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Tên sản phẩm *</label>
                <input
                  id="name"
                  name="name"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="VD: Máy ghép mí lon TDFJ-160"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Slug</label>
                <input
                  id="slug"
                  name="slug"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="may-ghep-mi-lon-tdfj-160"
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  title="Chỉ chữ thường, số và dấu gạch ngang"
                />
                <p id="slugHint" className="mt-1 text-xs text-gray-500"></p>
              </div>

              <div>
                <label className="block text-sm font-medium">SKU</label>
                <input name="sku" className="mt-1 w-full rounded-lg border px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Giá</label>
                <input
                  name="price"
                  type="number"
                  step="1"
                  min="0"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="VD: 125000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Danh mục</label>
                <select name="categoryId" className="mt-1 w-full rounded-lg border px-3 py-2">
                  <option value="">-- Chưa chọn --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Mô tả ngắn</label>
                <input
                  name="short"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="Tóm tắt 1–2 câu về công dụng chính…"
                />
              </div>

              {/* Ảnh đại diện */}
              <div className="md:col-span-2">
                <ImageField
                  name="coverImage"
                  label="Ảnh đại diện"
                  folder="mcbrother/products"
                  placeholder="Dán URL ảnh hoặc bấm Upload"
                />
              </div>
              {/* Thư viện ảnh (nhiều ảnh) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Thư viện ảnh sản phẩm (nhiều ảnh)
                </label>
                <ProductImagesField name="images" folder="mcbrother/products" />
              </div>

              {/* Video */}
              {/* Video */}
              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium">Link video (YouTube/Cloudinary)</label>
                <input
                  id="videoUrl"
                  name="videoUrl"
                  type="url"
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="https://www.youtube.com/watch?v=..."
                  defaultValue=""
                />
                <p className="text-xs text-muted-foreground">
                  Dán link YouTube (tự chuyển sang /embed) hoặc link video Cloudinary/MP4.
                </p>
                <div id="videoPreviewWrap" className="mt-2 hidden">
                  <div className="text-xs text-gray-600 mb-2">Xem trước video:</div>
                  <div className="rounded-lg border bg-black/5 p-2">
                    <div className="aspect-video w-full">
                      <iframe
                        id="ytPreview"
                        className="hidden h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                      <video id="mp4Preview" className="hidden h-full w-full" controls />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 md:col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="published" defaultChecked className="h-4 w-4" />
                  <span>Hiển thị</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="isFeatured" className="h-4 w-4" />
                  <span>Nổi bật</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: Nội dung (Rich text / HTML) */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">Nội dung chi tiết</div>
            <div className="p-5">
              <RichEditor name="description" value="" />
            </div>
          </div>

          {/* Card 3: Thông số kỹ thuật */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">Thông số kỹ thuật</div>
            <div className="p-5 grid gap-4 md:grid-cols-2">
              <div><label className="block text-sm font-medium">Công suất (power)</label><input name="power" className="mt-1 w-full rounded-lg border px-3 py-2" /></div>
              <div><label className="block text-sm font-medium">Điện áp (voltage)</label><input name="voltage" className="mt-1 w-full rounded-lg border px-3 py-2" /></div>
              <div><label className="block text-sm font-medium">Cân nặng (weight)</label><input name="weight" className="mt-1 w-full rounded-lg border px-3 py-2" /></div>
              <div><label className="block text-sm font-medium">Kích thước (dimensions)</label><input name="dimensions" className="mt-1 w-full rounded-lg border px-3 py-2" /></div>
              <div><label className="block text-sm font-medium">Chức năng (functions)</label><input name="functions" className="mt-1 w-full rounded-lg border px-3 py-2" /></div>
              <div><label className="block text-sm font-medium">Vật liệu (material)</label><input name="material" className="mt-1 w-full rounded-lg border px-3 py-2" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium">Bảo hành (warranty)</label>
              <select name="warranty" className="mt-1 w-full rounded-lg border px-3 py-2" defaultValue="12 tháng">
                <option value="0 tháng">Vật tư tiêu hao không bảo hành</option>
                <option value="6 tháng">6 tháng</option>
                <option value="12 tháng">12 tháng</option>
                <option value="18 tháng">18 tháng</option>
                <option value="24 tháng">24 tháng</option>
              </select>
            </div>
          </div>

          {/* Card 3.5: Thông số bổ sung (tuỳ chỉnh) */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">
              Thông số bổ sung (tuỳ chỉnh)
            </div>

            <div className="p-5 space-y-4">
              <div id="attrWrap" className="space-y-3"></div>

              <button type="button" id="addAttrBtn" className="text-sm text-blue-600">
                + Thêm thuộc tính
              </button>

              <input type="hidden" name="attributes" id="attrInput" />
            </div>
          </div>

          {/* Card 4: Bảng thông số nâng cao */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">
              Bảng thông số nâng cao
            </div>

            <div className="p-5 space-y-4">

              {/* Columns */}
              <div>
                <label className="block text-sm font-medium">Model (các cột)</label>
                <div id="specColumnsWrap" className="space-y-2"></div>
                <button type="button" id="addColumnBtn" className="text-sm text-blue-600">
                  + Thêm model
                </button>
              </div>

              {/* Rows */}
              <div>
                <label className="block text-sm font-medium">Thông số</label>
                <div id="specRowsWrap" className="space-y-2"></div>

                <button
                  type="button"
                  id="addRowBtn"
                  className="text-sm text-blue-600"
                >
                  + Thêm model
                </button>
              </div>

              {/* hidden input */}
              <input type="hidden" name="specTable" id="specTableInput" />

            </div>
          </div>
          {/* Card 5: FAQ */}
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">
              Câu hỏi thường gặp (FAQ)
            </div>

            <div className="p-5 space-y-4">
              <div id="faqWrap" className="space-y-3"></div>

              <button type="button" id="addFaqBtn" className="text-sm text-blue-600">
                + Thêm câu hỏi
              </button>

              <input type="hidden" name="faqs" id="faqInput" />
            </div>
          </div>
        </section>


        {/* Cột phải: SEO */}
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3 font-medium">SEO</div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium">Meta title</label>
                <input id="metaTitle" name="metaTitle" className="mt-1 w-full rounded-lg border px-3 py-2" />
                <p id="metaTitleCount" className="mt-1 text-xs text-gray-500"></p>
              </div>
              <div>
                <label className="block text sm font-medium">Meta description</label>
                <textarea id="metaDescription" name="metaDescription" rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
                <p id="metaDescCount" className="mt-1 text-xs text-gray-500"></p>
              </div>
              <div>
                <label className="block text-sm font-medium">Canonical URL</label>
                <input name="canonicalUrl" className="mt-1 w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">OG Image (URL)</label>
                <input name="ogImage" className="mt-1 w-full rounded-lg border px-3 py-2" />
              </div>
            </div>
          </div>

          <button id="submitBtn" className="w-full rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Lưu sản phẩm
          </button>
        </aside>
      </form>

      {/* ---------- Client enhancements via Next/Script ---------- */}
      <Script id="product-new-enhance" strategy="afterInteractive">{`
(function(){
  const $ = (sel)=>document.querySelector(sel);
  const nameEl = $('#name');
  const slugEl = $('#slug');
  const slugHint = $('#slugHint');
  const videoInput = $('#videoUrl');
  const videoWrap = $('#videoPreviewWrap');
  const ytPreview = $('#ytPreview');
  const mp4Preview = $('#mp4Preview');
  const form = $('#productForm');
  const submitBtn = $('#submitBtn');
  const metaTitle = $('#metaTitle');
  const metaDescription = $('#metaDescription');
  const metaTitleCount = $('#metaTitleCount');
  const metaDescCount = $('#metaDescCount');

  // NEW ELEMENTS
  const specColumnsWrap = document.getElementById('specColumnsWrap');
  const specRowsWrap = document.getElementById('specRowsWrap');
  const specTableInput = document.getElementById('specTableInput');
  const faqWrap = document.getElementById('faqWrap');
  const faqInput = document.getElementById('faqInput');

  // THÔNG SỐ BỔ SUNG
  const attrWrap = document.getElementById('attrWrap');
  const attrInput = document.getElementById('attrInput');

  let dirty = false;
  const markDirty = function(){ dirty = true; };

  // ---------- Auto slug ----------
const toSlug = function(s){
    return s
      .toLowerCase()
      .replace(/đ/g, 'd')                          // 👈 thêm dòng này
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9\s-]/g,'')
      .trim()
      .replace(/[\s_-]+/g,'-')
      .replace(/^-+|-+$/g,'');
  };

  let lastAutoSlug = '';

  const syncSlug = function(){
    if (!nameEl) return;
    const base = toSlug(nameEl.value || '');
    if (slugEl && (slugEl.value === '' || slugEl.value === lastAutoSlug)) {
      slugEl.value = base;
      lastAutoSlug = base;
      if (slugHint) slugHint.textContent = base ? 'Slug gợi ý: ' + base : '';
    }
  };

  if (nameEl) nameEl.addEventListener('input', function(){ syncSlug(); markDirty(); });
  if (slugEl) slugEl.addEventListener('input', markDirty);

  // ---------- Video preview ----------
  const toYouTubeEmbed = function(u){
    try {
      const url = new URL(u);
      if (/^(www\\.)?youtube\\.com$/i.test(url.hostname) && url.searchParams.get('v')) {
        return 'https://www.youtube.com/embed/' + url.searchParams.get('v');
      }
      if (/^(youtu\\.be)$/i.test(url.hostname)) {
        return 'https://www.youtube.com/embed/' + url.pathname.replace(/^\\//,'');
      }
    } catch {}
    return null;
  };

  const isVideoFile = function(u){
    return /\\.(mp4|webm|ogg)(\\?.*)?$/i.test(u) || /\\/video\\/upload\\//.test(u);
  };

  const updateVideo = function(){
    if (!videoInput || !videoWrap || !ytPreview || !mp4Preview) return;

    const raw = (videoInput.value || '').trim();
    ytPreview.classList.add('hidden');
    mp4Preview.classList.add('hidden');
    videoWrap.classList.add('hidden');

    if (!raw) return;

    const yt = toYouTubeEmbed(raw);
    if (yt) {
      ytPreview.src = yt;
      ytPreview.classList.remove('hidden');
      videoWrap.classList.remove('hidden');
      return;
    }

    if (isVideoFile(raw)) {
      mp4Preview.src = raw;
      mp4Preview.classList.remove('hidden');
      videoWrap.classList.remove('hidden');
    }
  };

  if (videoInput) {
    videoInput.addEventListener('input', function(){ updateVideo(); markDirty(); });
    updateVideo();
  }

  // ---------- SEO ----------
  const paintCount = function(el, val, min, max){
    const len = val.length;
    const ok = len>=min && len<=max;
    el.textContent = len + ' ký tự' + (ok ? ' (tốt)' : '');
    el.style.color = ok ? '#16a34a' : '#6b7280';
  };

  const tickSEO = function(){
    if (metaTitle && metaTitleCount) paintCount(metaTitleCount, metaTitle.value, 50, 60);
    if (metaDescription && metaDescCount) paintCount(metaDescCount, metaDescription.value, 140, 160);
  };

  if (metaTitle) metaTitle.addEventListener('input', function(){ tickSEO(); markDirty(); });
  if (metaDescription) metaDescription.addEventListener('input', function(){ tickSEO(); markDirty(); });
  tickSEO();

  // ---------- SPEC TABLE ----------
  const addColumn = function(){
    if (!specColumnsWrap) return;
    const input = document.createElement('input');
    input.placeholder = 'Tên model';
    input.className = 'w-full border rounded px-3 py-2';
    specColumnsWrap.appendChild(input);
  };

  const addRow = function(){
    if (!specRowsWrap) return;

    const row = document.createElement('div');
    row.className = 'grid gap-2';

    row.innerHTML =
      '<input placeholder="Tên thông số" class="border px-2 py-1 rounded"/>' +
      '<div class="values flex gap-2 flex-wrap"></div>' +
      '<button type="button" class="addVal text-xs text-blue-500">+ thêm giá trị</button>';

    const valuesWrap = row.querySelector('.values');
    const addValBtn = row.querySelector('.addVal');

    addValBtn.onclick = function(){
      const valInput = document.createElement('input');
      valInput.className = 'border px-2 py-1 rounded';
      valuesWrap.appendChild(valInput);
    };

    specRowsWrap.appendChild(row);
  };

  const addFaq = function(){
    if (!faqWrap) return;

    const item = document.createElement('div');
    item.className = 'space-y-1';

    item.innerHTML =
      '<input placeholder="Câu hỏi" class="w-full border px-3 py-2 rounded"/>' +
      '<input placeholder="Trả lời" class="w-full border px-3 py-2 rounded"/>';

    faqWrap.appendChild(item);
  };

  // ---------- THÔNG SỐ BỔ SUNG ----------
  const addAttr = function(){
    if (!attrWrap) return;

    const row = document.createElement('div');
    row.className = 'flex gap-2';

    row.innerHTML =
      '<input placeholder="Tên thuộc tính (VD: Xuất xứ)" class="attrName flex-1 border px-3 py-2 rounded"/>' +
      '<input placeholder="Giá trị (VD: Đài Loan)" class="attrValue flex-1 border px-3 py-2 rounded"/>' +
      '<button type="button" class="removeAttr text-red-500 text-sm px-2">Xoá</button>';

    row.querySelector('.removeAttr').onclick = function(){
      row.remove();
    };

    attrWrap.appendChild(row);
  };

  document.getElementById('addColumnBtn')?.addEventListener('click', addColumn);
  document.getElementById('addRowBtn')?.addEventListener('click', addRow);
  document.getElementById('addFaqBtn')?.addEventListener('click', addFaq);
  document.getElementById('addAttrBtn')?.addEventListener('click', addAttr);

  // ---------- SUBMIT ----------
  if (form) {
    form.addEventListener('submit', function(){
      dirty = false;
      submitBtn && submitBtn.setAttribute('disabled','true');

      // spec table
      const columns = Array.from(specColumnsWrap?.querySelectorAll('input') || []).map(function(i){
        return i.value;
      });

      const rows = Array.from(specRowsWrap?.children || []).map(function(row){
        const inputs = row.querySelectorAll('input');

        return {
          label: inputs[0] ? inputs[0].value : '',
          values: Array.from(inputs).slice(1).map(function(i){
            return i.value;
          })
        };
      });

      if (specTableInput) {
        specTableInput.value = JSON.stringify({ columns: columns, rows: rows });
      }

      // faq
      const faq = Array.from(faqWrap?.children || []).map(function(item){
        const inputs = item.querySelectorAll('input');

        return {
          question: inputs[0] ? inputs[0].value : '',
          answer: inputs[1] ? inputs[1].value : ''
        };
      });

      if (faqInput) {
        faqInput.value = JSON.stringify(faq);
      }

      // thông số bổ sung
      const attrs = Array.from(attrWrap?.children || [])
        .map(function(row){
          return {
            name: row.querySelector('.attrName')?.value?.trim() || '',
            value: row.querySelector('.attrValue')?.value?.trim() || '',
          };
        })
        .filter(function(a){ return a.name && a.value; });

      if (attrInput) {
        attrInput.value = JSON.stringify(attrs);
      }
    });
  }

  // ---------- Warn ----------
  window.addEventListener('beforeunload', function(e){
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // init
  syncSlug();

})();
`}</Script>
    </div>
  );
}