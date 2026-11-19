# xaydungnhatrongoi.vn — measured behaviors

All values were measured on the live site (Chrome, 1440 / 768 / 390 px) and re-checked against the clone.

## Breakpoints (Flatsome)
| Range | Header | Notes |
|---|---|---|
| ≥ 850px | logo left (200×90), slogan, search + flags right; green `#wide-nav` (55px, `#14974a`) with centred uppercase menu | `show-for-medium` hidden |
| 550–849px | hamburger (green round) left, logo centred, search right; `#wide-nav` hidden | header-main 90px |
| ≤ 549px | same as above | header-main 70px, slider arrows hidden |

## Header
- **Sticky**: when scrolling **down** past `header height + 100` (245px desktop), `.header-wrapper` gets `stuck` (position fixed, `stuckMoveDown` 0.6s, header-main 70px) and `#header` gets inline `height:145px`. **Any upward scroll removes `stuck`** – the header goes back to normal flow (it is not visible mid-page). Scrolling down again re-sticks.
- **Dropdowns**: hoverIntent `sensitivity 3, interval 20ms, timeout 70ms`. Open adds `li.current-dropdown` (dropdown fades in, opacity .25s, with arrow because `body.nav-dropdown-has-arrow`). Flatsome repositions a dropdown that overflows `.header-inner` (`margin-left: -overflow`) – that is why the search dropdown sits left of the icon. Items: gradient `146.75deg #44be4e → #16bbff`, white text, 1px #ddd dividers.
- **Top link hover**: yellow `#e6dc13` background, white text.
- **Search icon**: same dropdown (search field + green button); a click keeps it open, outside click / Esc closes it.
- **Language flags**: Google Translate element (`vi` page, `en/fr/vi`), `#langen` / `#langvi` drive `.goog-te-combo`.

## Mobile menu (off-canvas, Magnific Popup markup)
- Hamburger → `.mfp-bg.off-canvas.dark.off-canvas-left.main-menu-overlay` (black, opacity .6, .25s) + `.mfp-wrap … > .mfp-content` 260px panel sliding from `translateX(-260px)` (.2s). `html` gets `has-off-canvas has-off-canvas-left`.
- Parent items get a `button.toggle` (angle-down); clicking toggles `li.active` → `ul.children` shown, icon rotates 180° (.3s). State is kept after closing.
- Close: X button, overlay click, Esc, or link click; removal delay 300ms (`mfp-removing`).

## Sliders (Flickity)
- **Hero** & **Thiện nguyện**: cellAlign center, wrapAround, autoPlay 6000ms, pause on hover, page dots, adaptiveHeight, dragThreshold 10, selectedAttraction .1, friction .6. Prev/next are circles, opacity 0 → .7 on slider hover.
- **Đội ngũ** (4/2/1 cols) and **Khách hàng** (8/5/2 cols): groupCells 100%, cellAlign left, wrapAround, prev/next, no dots, no autoplay.

## Content
- **Tabs (Dự án nổi bật)**: `li.tab.active` + `.panel.active`; pills on the right on desktop.
- **Reveal**: `[data-animate]` elements get `data-animated="true"` when they enter the viewport (fadeInUp / fadeInLeft / fadeInRight). `data-aos` is inert (AOS is not loaded on the original).
- **Lazy backgrounds**: `.bg` → `.bg-loaded` (opacity 0 → 1, 1s).
- **Hover**: `.col-hd` green scaleX fill (.3s); `.image-zoom` scale; overlays on `.icon-taisao` / `.icon-quytrinh`.
- **Video**: `.open-video` opens an `mfp-iframe-holder` lightbox with `youtube.com/embed/ID?autoplay=1`.
- **Back to top**: `#top-link` becomes `.active` when `scrollY > innerHeight`; smooth scroll to top; hidden ≤ 849px.
- **Floating CTAs**: Zalo + phone buttons fixed bottom-left.

## Deliberately not cloned
Injected SEO spam on the live site: hidden casino link blocks (`top:-82371px` …), the white "Roll X" text (and the "Tài liệu của đối tác…" block, ~370–400px of blank space before the footer), a fixed hidden google.com link, and the hidden `menu-item-114552` link (kept only as an empty, inert 14px menu item so the nav geometry is identical).

## Inner pages (69 files + index.html)
- Clean URLs (no `.html`): each page is `slug/index.html` and every link is `/slug`, following the original paths (`/tin-tuc/abc`, `/nha-pho/page/2`, `/danh-muc/tin-tuc`, `/tag/biet-thu`). Assets use root paths (`/css`, `/js`, `/images`), so the site must be served from a domain root by a web server (it does not work when opened via `file://`).
- Repetitive types are represented by samples. Links to posts that were not built point to a sample of the same type:
  - project post → `/cong-trinh-anh-phung-an-khanh`
  - house design → `/mau-nha-pho-3-tang-hien-dai-16`
  - article → `/tai-sao-nen-chon-xay-dung-adf-khi-xay-khach-san`
  - `tin-tuc/*` → `/tin-tuc-bao-gia-xay-nha-tai-ha-noi-moi-nhat`
  - `danh-muc/*` → `/danh-muc-tin-tuc`
  - `tag/*` → `/tag-biet-thu`
  - `/page/N` → page 1 of that archive
- **Image lightbox** (`a.lightbox-gallery`): Magnific-style image popup. The original groups links by parent `.col-inner`, so each image opens alone. Arrows and ←/→ only appear when there is more than one image. Close: Esc, click, ✕.
- **Banner grid** (`[data-packery-options]`): Packery-like layout, top-most then left-most fit. Re-lays out on load and on resize; `processing` is removed on load.
- **Countdown** (`.ux-timer`): the date is in the past, so it shows `0days 00hours 00mins 00secs`.
- **Contact Form 7**: client-side validation only (required, email, tel), using CF7's classes and states. A valid submit shows a notice that this static site does not send data.
- **Table of contents** (ez-toc): CSS-only checkbox toggle, as on the original.
- **Search forms**: submit is cancelled (no backend).
- **Facebook comments / SDK**: dropped (they need the live URL).
- **Known faithful quirks**:
  - Some posts contain `figure.wp-caption` with `style="width:2560px"`, which overflows horizontally on mobile. The markup and CSS are the original's.
  - Some banners have `background-image: 8264` (invalid) in the original CSS, so they render without an image.
