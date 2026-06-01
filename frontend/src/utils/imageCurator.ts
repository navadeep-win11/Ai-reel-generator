/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Curator of dark premium aesthetic stock images to back up the custom styles.
// These are handpicked high-contrast dark images that instantly elevate the SaaS UI.

const aestheticImages = {
  pencil_sketch: [
    "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=700&auto=format&fit=crop", // hand sketch book
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=700&auto=format&fit=crop", // abstract lines graphite
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=700&auto=format&fit=crop", // artistic texture charcoal
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=700&auto=format&fit=crop", // deep pencil shading texture
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=700&auto=format&fit=crop", // fine dark textured drawing blueprint
  ],
  watercolor: [
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=700&auto=format&fit=crop", // deep fluid watercolor indigo
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=700&auto=format&fit=crop", // dark ink wash blending
    "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=700&auto=format&fit=crop", // soft organic glowing neon paint bleed
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=700&auto=format&fit=crop", // fluid abstract moody painting
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=700&auto=format&fit=crop", // high contrast dark paint stroke
  ],
  dark_minimalist: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=700&auto=format&fit=crop", // pure black minimal sand pattern
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=700&auto=format&fit=crop", // elegant black paper curves
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=700&auto=format&fit=crop", // dark concrete slab hairline architecture
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=700&auto=format&fit=crop", // sleek glass monolithic structure dark
    "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?q=80&w=700&auto=format&fit=crop", // black obsidian dark stone peak
  ],
  cinematic_motorcycle: [
    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=700&auto=format&fit=crop", // high speed night bike headlights
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=700&auto=format&fit=crop", // custom naked headlight night
    "https://images.unsplash.com/photo-1440615496174-ee7cebe1ec9f?q=80&w=700&auto=format&fit=crop", // dark premium motorbike carbon tire tracks
    "https://images.unsplash.com/photo-1475965124430-10a4025456fd?q=80&w=700&auto=format&fit=crop", // street wet asphalt reflections neon
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=700&auto=format&fit=crop", // sleek glowing tail light exhaust night blur
  ]
};

export function getAestheticImage(style: string, index: number = 0): string {
  const images = aestheticImages[style as keyof typeof aestheticImages] || aestheticImages.dark_minimalist;
  const safeIndex = Math.abs(index) % images.length;
  return images[safeIndex];
}
