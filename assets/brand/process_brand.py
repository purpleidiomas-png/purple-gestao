from pathlib import Path
from PIL import Image, ImageCms

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
PREVIEWS = ROOT / "previews"
PREVIEWS.mkdir(parents=True, exist_ok=True)
SRGB_PROFILE = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()

def edge_flood_alpha(path: Path, kind: str) -> Image.Image:
    src = Image.open(path).convert("RGB")
    rgba = src.convert("RGBA")
    alpha = Image.new("L", src.size, 255)
    px, ap = src.load(), alpha.load()
    w, h = src.size
    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.extend(((x, 0), (x, h - 1)))
    for y in range(1, h - 1):
        stack.extend(((0, y), (w - 1, y)))

    def background(rgb):
        r, g, b = rgb
        if kind == "black":
            return max(r, g, b) <= 100 and max(r, g, b) - min(r, g, b) <= 22
        return min(r, g, b) >= 208 and max(r, g, b) - min(r, g, b) <= 18

    while stack:
        x, y = stack.pop()
        idx = y * w + x
        if seen[idx]:
            continue
        seen[idx] = 1
        if not background(px[x, y]):
            continue
        ap[x, y] = 0
        if x: stack.append((x - 1, y))
        if x + 1 < w: stack.append((x + 1, y))
        if y: stack.append((x, y - 1))
        if y + 1 < h: stack.append((x, y + 1))

    # Cavidades fechadas (olhos de letras) contêm o mesmo matte, mas não alcançam
    # fisicamente a borda. Removemos somente pixels que satisfazem exatamente o
    # classificador do fundo; as cores da marca ficam fora desse conjunto.
    for y in range(h):
        for x in range(w):
            if background(px[x, y]):
                ap[x, y] = 0

    rgba.putalpha(alpha)
    return rgba

def padded_content(image: Image.Image, target_size, safety=0.06) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Imagem sem conteúdo após remoção do fundo")
    content = image.crop(bbox)
    tw, th = target_size
    available_w = round(tw * (1 - 2 * safety))
    available_h = round(th * (1 - 2 * safety))
    scale = min(available_w / content.width, available_h / content.height)
    size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
    content = content.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    canvas.alpha_composite(content, ((tw - size[0]) // 2, (th - size[1]) // 2))
    return canvas

def horizontal_logo(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    content = image.crop(bbox)
    width = 2400
    side = round(width * 0.06)
    content_w = width - 2 * side
    scale = content_w / content.width
    content_h = round(content.height * scale)
    pad_y = round(content_h * 0.06 / 0.88)
    canvas = Image.new("RGBA", (width, content_h + 2 * pad_y), (0, 0, 0, 0))
    canvas.alpha_composite(content.resize((content_w, content_h), Image.Resampling.LANCZOS), (side, pad_y))
    return canvas

def save_png(image, name):
    image.save(ROOT / name, "PNG", optimize=True, icc_profile=SRGB_PROFILE)

purple = edge_flood_alpha(SOURCE / "source-logo-purple.png", "checker")
white = edge_flood_alpha(SOURCE / "source-logo-white.png", "black")
icon = edge_flood_alpha(SOURCE / "source-icon.png", "checker")

logo_purple = horizontal_logo(purple)
logo_white = horizontal_logo(white)
icon_1024 = padded_content(icon, (1024, 1024))

save_png(logo_purple, "logo-purple-gestao.png")
save_png(logo_white, "logo-purple-gestao-white.png")
save_png(icon_1024, "icon-purple-gestao-1024.png")
for size, name in [(512, "icon-purple-gestao-512.png"), (192, "icon-purple-gestao-192.png"), (180, "apple-touch-icon.png"), (64, "favicon-64.png"), (32, "favicon-32.png"), (16, "favicon-16.png")]:
    save_png(icon_1024.resize((size, size), Image.Resampling.LANCZOS), name)

ico48 = icon_1024.resize((48, 48), Image.Resampling.LANCZOS)
ico48.save(ROOT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

final_pngs = [
    ROOT / "logo-purple-gestao.png", ROOT / "logo-purple-gestao-white.png",
    ROOT / "icon-purple-gestao-1024.png", ROOT / "icon-purple-gestao-512.png",
    ROOT / "icon-purple-gestao-192.png", ROOT / "apple-touch-icon.png",
    ROOT / "favicon-64.png", ROOT / "favicon-32.png", ROOT / "favicon-16.png",
]

for bg_name, bg in [("white", (255,255,255)), ("black", (0,0,0)), ("red", (190,20,30))]:
    sheet = Image.new("RGB", (1600, 1480), bg)
    y = 35
    for i, path in enumerate(final_pngs):
        im = Image.open(path).convert("RGBA")
        max_w, max_h = (1450, 220) if i < 2 else (240, 240)
        im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        x = (1600 - im.width) // 2 if i < 2 else 90 + ((i - 2) % 4) * 375
        if i >= 2:
            y = 560 + ((i - 2) // 4) * 380
        sheet.paste(im, (x, y), im)
        if i < 2: y += 255
    sheet.save(PREVIEWS / f"preview-{bg_name}.png", "PNG", optimize=True)

for path in final_pngs:
    im = Image.open(path)
    alpha = im.getchannel("A")
    print(f"{path.name}\t{im.size[0]}x{im.size[1]}\t{im.mode}\talpha={alpha.getextrema()}\ttransparent={sum(1 for v in alpha.get_flattened_data() if v == 0)}")
