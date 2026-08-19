import os
import math
from PIL import Image, ImageDraw, ImageFont

STICKER_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "stickers")
os.makedirs(STICKER_DIR, exist_ok=True)

SIZE = 512
CENTER = SIZE // 2
RADIUS = 220

def create_base_canvas():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

def draw_rounded_badge(draw, color_top, color_bottom, stroke_color):
    # Draw soft outer shadow
    for i in range(12, 0, -2):
        alpha = int(18 * (1 - i / 12))
        draw.ellipse(
            [CENTER - RADIUS - i, CENTER - RADIUS - i + 8, CENTER + RADIUS + i, CENTER + RADIUS + i + 8],
            fill=(0, 0, 0, alpha)
        )
    
    # Draw circular gradient badge
    for r in range(RADIUS, 0, -1):
        ratio = 1.0 - (r / RADIUS)
        r_col = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
        g_col = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
        b_col = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
        draw.ellipse([CENTER - r, CENTER - r, CENTER + r, CENTER + r], fill=(r_col, g_col, b_col, 255))
    
    # Draw crisp inner border
    draw.ellipse([CENTER - RADIUS, CENTER - RADIUS, CENTER + RADIUS, CENTER + RADIUS], outline=stroke_color, width=8)
    draw.ellipse([CENTER - RADIUS + 8, CENTER - RADIUS + 8, CENTER + RADIUS - 8, CENTER + RADIUS - 8], outline=(255, 255, 255, 60), width=3)

# 1. Lecturer Office
def generate_lecturer_office():
    img = create_base_canvas()
    draw = ImageDraw.Draw(img)
    draw_rounded_badge(draw, (30, 58, 138), (15, 23, 42), (245, 158, 11)) # Navy to Slate, Gold border
    
    # Bookshelf / Desk
    draw.rounded_rectangle([140, 310, 372, 350], radius=8, fill=(217, 119, 6)) # Desk
    draw.rectangle([160, 350, 180, 400], fill=(180, 83, 9)) # Desk leg
    draw.rectangle([332, 350, 352, 400], fill=(180, 83, 9)) # Desk leg
    
    # Book Stack
    draw.rounded_rectangle([170, 280, 240, 310], radius=4, fill=(239, 68, 68)) # Red book
    draw.rounded_rectangle([175, 255, 235, 280], radius=4, fill=(59, 130, 246)) # Blue book
    draw.rounded_rectangle([180, 235, 230, 255], radius=4, fill=(16, 185, 129)) # Green book

    # Desk Lamp
    draw.line([(310, 310), (330, 230)], fill=(229, 231, 235), width=8)
    draw.line([(330, 230), (300, 210)], fill=(229, 231, 235), width=8)
    draw.polygon([(280, 225), (320, 195), (290, 185)], fill=(245, 158, 11)) # Lamp shade
    # Light beam
    draw.polygon([(280, 225), (230, 310), (340, 310), (300, 210)], fill=(254, 240, 138, 45))

    # Academic Diploma / Certificate
    draw.rounded_rectangle([210, 130, 302, 195], radius=6, fill=(255, 255, 255))
    draw.rounded_rectangle([220, 140, 292, 185], radius=4, outline=(203, 213, 225), width=2)
    draw.ellipse([246, 150, 266, 170], fill=(217, 119, 6)) # Ribbon seal
    draw.polygon([(251, 168), (246, 185), (256, 178)], fill=(217, 119, 6))
    draw.polygon([(261, 168), (266, 185), (256, 178)], fill=(217, 119, 6))

    img.save(os.path.join(STICKER_DIR, "sticker_lecturer_office.png"))

# 2. After Class
def generate_after_class():
    img = create_base_canvas()
    draw = ImageDraw.Draw(img)
    draw_rounded_badge(draw, (6, 95, 70), (4, 47, 46), (52, 211, 153)) # Emerald gradient
    
    # Campus building / Arch
    draw.polygon([(180, 210), (256, 140), (332, 210)], fill=(243, 244, 246)) # Pediment
    draw.rounded_rectangle([190, 210, 322, 340], radius=6, fill=(229, 231, 235))
    draw.rectangle([210, 220, 225, 340], fill=(209, 213, 219)) # Pillar
    draw.rectangle([250, 220, 262, 340], fill=(209, 213, 219)) # Pillar
    draw.rectangle([287, 220, 302, 340], fill=(209, 213, 219)) # Pillar
    # Clock
    draw.ellipse([244, 165, 268, 189], fill=(255, 255, 255), outline=(16, 185, 129), width=3)
    draw.line([(256, 177), (256, 170)], fill=(5, 150, 105), width=2)
    draw.line([(256, 177), (262, 177)], fill=(5, 150, 105), width=2)

    # Student Backpack / Notebook in foreground
    draw.rounded_rectangle([140, 280, 220, 360], radius=16, fill=(245, 158, 11)) # Backpack
    draw.rounded_rectangle([155, 310, 205, 350], radius=8, fill=(217, 119, 6)) # Pocket
    draw.ellipse([170, 260, 190, 280], fill=(217, 119, 6)) # Handle

    # Speech bubbles (discussion)
    draw.rounded_rectangle([290, 250, 370, 290], radius=12, fill=(255, 255, 255))
    draw.polygon([(300, 290), (315, 290), (295, 305)], fill=(255, 255, 255))
    draw.ellipse([305, 267, 311, 273], fill=(16, 185, 129))
    draw.ellipse([325, 267, 331, 273], fill=(16, 185, 129))
    draw.ellipse([345, 267, 351, 273], fill=(16, 185, 129))

    img.save(os.path.join(STICKER_DIR, "sticker_after_class.png"))

# 3. London Restaurant
def generate_london_restaurant():
    img = create_base_canvas()
    draw = ImageDraw.Draw(img)
    draw_rounded_badge(draw, (153, 27, 27), (69, 10, 10), (251, 191, 36)) # Royal Crimson, Gold border
    
    # Dining Cloche Plate
    draw.ellipse([140, 310, 372, 360], fill=(229, 231, 235)) # Base plate
    draw.chord([160, 180, 352, 330], start=180, end=360, fill=(243, 244, 246), outline=(209, 213, 219), width=3) # Cloche dome
    draw.ellipse([244, 165, 268, 189], fill=(251, 191, 36)) # Handle knob
    
    # Fork & Knife
    draw.line([(120, 200), (120, 330)], fill=(243, 244, 246), width=8) # Fork handle
    draw.line([(110, 200), (130, 200)], fill=(243, 244, 246), width=6)
    draw.line([(110, 200), (110, 230)], fill=(243, 244, 246), width=4)
    draw.line([(120, 200), (120, 230)], fill=(243, 244, 246), width=4)
    draw.line([(130, 200), (130, 230)], fill=(243, 244, 246), width=4)

    draw.line([(392, 200), (392, 330)], fill=(243, 244, 246), width=8) # Knife handle
    draw.chord([380, 180, 404, 240], start=270, end=90, fill=(243, 244, 246)) # Blade

    # British Tea cup accent
    draw.rounded_rectangle([220, 340, 292, 385], radius=10, fill=(254, 243, 199))
    draw.ellipse([215, 375, 297, 395], fill=(254, 243, 199)) # Saucer
    draw.arc([280, 348, 305, 375], start=270, end=90, fill=(254, 243, 199), width=4)

    img.save(os.path.join(STICKER_DIR, "sticker_london_restaurant.png"))

# 4. Melbourne Cafe
def generate_melbourne_cafe():
    img = create_base_canvas()
    draw = ImageDraw.Draw(img)
    draw_rounded_badge(draw, (120, 53, 15), (69, 26, 3), (251, 146, 60)) # Espresso Brown, Amber border
    
    # Modern Melbourne Café Cup
    draw.ellipse([156, 340, 356, 385], fill=(243, 244, 246)) # Saucer
    draw.ellipse([168, 345, 344, 380], fill=(229, 231, 235))
    
    # Cup body
    draw.polygon([(180, 240), (332, 240), (312, 345), (200, 345)], fill=(255, 255, 255))
    draw.ellipse([180, 220, 332, 260], fill=(255, 255, 255)) # Top rim
    draw.ellipse([186, 226, 326, 254], fill=(146, 64, 14)) # Coffee surface
    
    # Latte Art Heart
    draw.ellipse([236, 232, 260, 246], fill=(254, 243, 199))
    draw.ellipse([252, 232, 276, 246], fill=(254, 243, 199))
    draw.polygon([(238, 242), (274, 242), (256, 252)], fill=(254, 243, 199))

    # Cup Handle
    draw.arc([305, 255, 355, 320], start=270, end=90, fill=(255, 255, 255), width=12)

    # Rising Steam Swirls
    for x_offset in (226, 256, 286):
        draw.arc([x_offset - 15, 140, x_offset + 15, 180], start=270, end=90, fill=(254, 243, 199, 160), width=4)
        draw.arc([x_offset - 15, 175, x_offset + 15, 215], start=90, end=270, fill=(254, 243, 199, 160), width=4)

    img.save(os.path.join(STICKER_DIR, "sticker_melbourne_cafe.png"))

# 5. Interview Room
def generate_interview_room():
    img = create_base_canvas()
    draw = ImageDraw.Draw(img)
    draw_rounded_badge(draw, (30, 41, 59), (15, 23, 42), (14, 165, 233)) # Slate to Dark Blue, Cyan border
    
    # Modern Conference / Interview Table
    draw.ellipse([130, 290, 382, 350], fill=(51, 65, 85))
    draw.ellipse([140, 295, 372, 345], fill=(71, 85, 105))
    
    # Candidate Folder / Resume
    draw.rounded_rectangle([216, 230, 296, 310], radius=6, fill=(255, 255, 255)) # Resume paper
    draw.rectangle([228, 245, 274, 250], fill=(14, 165, 233)) # Header bar
    draw.rectangle([228, 256, 284, 260], fill=(203, 213, 225))
    draw.rectangle([228, 266, 284, 270], fill=(203, 213, 225))
    draw.rectangle([228, 276, 270, 280], fill=(203, 213, 225))
    
    # Verified badge / Checkmark circle
    draw.ellipse([270, 215, 305, 250], fill=(16, 185, 129), outline=(255, 255, 255), width=3)
    draw.line([(278, 232), (285, 240)], fill=(255, 255, 255), width=3)
    draw.line([(285, 240), (298, 225)], fill=(255, 255, 255), width=3)

    # Executive Chairs
    draw.rounded_rectangle([150, 210, 190, 280], radius=10, fill=(15, 23, 42)) # Left chair
    draw.rounded_rectangle([322, 210, 362, 280], radius=10, fill=(15, 23, 42)) # Right chair

    img.save(os.path.join(STICKER_DIR, "sticker_interview_room.png"))

# 6. Career Fair
def generate_career_fair():
    img = create_base_canvas()
    draw = ImageDraw.Draw(img)
    draw_rounded_badge(draw, (88, 28, 135), (46, 16, 101), (249, 115, 22)) # Royal Purple, Coral Orange border
    
    # Exhibition Booth / Banner Canopy
    draw.polygon([(150, 160), (362, 160), (342, 205), (170, 205)], fill=(249, 115, 22)) # Canopy
    for i in range(150, 360, 35):
        fill_c = (255, 255, 255) if ((i - 150) // 35) % 2 == 0 else (234, 88, 12)
        draw.polygon([(i, 160), (i + 35, 160), (i + 30, 205), (i - 5, 205)], fill=fill_c)
    
    # Booth Pillars & Counter
    draw.rectangle([170, 205, 180, 320], fill=(229, 231, 235))
    draw.rectangle([332, 205, 342, 320], fill=(229, 231, 235))
    draw.rounded_rectangle([160, 300, 352, 360], radius=8, fill=(192, 132, 252)) # Counter
    draw.rounded_rectangle([170, 310, 342, 350], radius=6, fill=(255, 255, 255))

    # Handshake / Partnership Icon in center
    draw.ellipse([231, 225, 281, 275], fill=(249, 115, 22), outline=(255, 255, 255), width=3)
    # Badge Star
    draw.polygon([
        (256, 235), (260, 245), (271, 246), (262, 253), (265, 263),
        (256, 257), (247, 263), (250, 253), (241, 246), (252, 245)
    ], fill=(255, 255, 255))

    img.save(os.path.join(STICKER_DIR, "sticker_career_fair.png"))

if __name__ == "__main__":
    generate_lecturer_office()
    generate_after_class()
    generate_london_restaurant()
    generate_melbourne_cafe()
    generate_interview_room()
    generate_career_fair()
    print("All 6 stickers generated successfully.")
