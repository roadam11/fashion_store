import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "חולצות", slug: "shirts", description: "חולצות לגבר ואישה" },
  { name: "מכנסיים", slug: "pants", description: "מכנסיים לכל מצב" },
  { name: "שמלות", slug: "dresses", description: "שמלות לכל אירוע" },
  { name: "ז'קטים", slug: "jackets", description: "ז'קטים ומעילים" },
  { name: "נעליים", slug: "shoes", description: "נעליים ואביזרים" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = ["שחור", "לבן", "כחול", "אדום", "ירוק", "אפור", "בז'"];

const PRODUCTS = [
  // חולצות
  { name: "חולצת כותנה קלאסית", categorySlug: "shirts", basePrice: 12900, description: "חולצת כותנה נוחה ואיכותית לכל יום" },
  { name: "חולצת פולו פרימיום", categorySlug: "shirts", basePrice: 18900, description: "חולצת פולו ייצוגית עם שרוולים קצרים" },
  { name: "חולצת פסים נאוטי", categorySlug: "shirts", basePrice: 15900, description: "חולצת פסים בסגנון ימי קלאסי" },
  { name: "חולצת אוברסייז אורבנית", categorySlug: "shirts", basePrice: 14900, description: "חולצה עם גזרת אוברסייז מודרנית" },
  { name: "חולצת לינן קיץ", categorySlug: "shirts", basePrice: 16900, description: "חולצת פשתן קלילה לימות הקיץ" },
  // מכנסיים
  { name: "ג'ינס סלים קלאסי", categorySlug: "pants", basePrice: 29900, description: "ג'ינס בגזרת סלים עם שטיפה בהירה" },
  { name: "מכנסי צ'ינו בז'", categorySlug: "pants", basePrice: 24900, description: "מכנסי צ'ינו אלגנטיים לשעות הפנאי" },
  { name: "מכנסי טרנינג פרמיום", categorySlug: "pants", basePrice: 19900, description: "מכנסי ספורט נוחים לאימון ולבית" },
  { name: "ג'ינס וואיד לג", categorySlug: "pants", basePrice: 31900, description: "ג'ינס רחב ברגל בסגנון רטרו" },
  { name: "מכנסי קרגו טקטי", categorySlug: "pants", basePrice: 27900, description: "מכנסי קרגו עם כיסים מרובים" },
  // שמלות
  { name: "שמלת מידי קיץ", categorySlug: "dresses", basePrice: 32900, description: "שמלת מידי פרחונית לעונת הקיץ" },
  { name: "שמלת קוקטייל שחורה", categorySlug: "dresses", basePrice: 45900, description: "שמלה אלגנטית לאירועי ערב" },
  { name: "שמלת בוהו מקסי", categorySlug: "dresses", basePrice: 38900, description: "שמלת מקסי בסגנון בוהו שיק" },
  { name: "שמלת ראפל רומנטית", categorySlug: "dresses", basePrice: 28900, description: "שמלה עם גדילים בגזרה נשית" },
  { name: "שמלת ג'ינס קז'ואל", categorySlug: "dresses", basePrice: 26900, description: "שמלת ג'ינס לסגנון יומיומי" },
  // ז'קטים
  { name: "ז'קט עור מלאכותי", categorySlug: "jackets", basePrice: 59900, description: "ז'קט עור בסגנון רוק קלאסי" },
  { name: "ברדס בומבר", categorySlug: "jackets", basePrice: 42900, description: "ז'קט בומבר עם כיסים רוכסן" },
  { name: "מעיל טרנץ' קלאסי", categorySlug: "jackets", basePrice: 89900, description: "מעיל טרנץ' לעונות המעבר" },
  { name: "חליפת קורדרוי", categorySlug: "jackets", basePrice: 52900, description: "ז'קט קורדרוי ביג'י" },
  { name: "ברדס פליס חורפי", categorySlug: "jackets", basePrice: 34900, description: "ברדס פליס חם ונוח לחורף" },
  // נעליים
  { name: "סניקרס לבן קלאסי", categorySlug: "shoes", basePrice: 39900, description: "סניקרס לבן נקי לסגנון יומיומי" },
  { name: "מגפי קובן שחור", categorySlug: "shoes", basePrice: 72900, description: "מגפי עקב קובן בעור פרמיום" },
  { name: "כפכפי בירקנשטוק", categorySlug: "shoes", basePrice: 29900, description: "כפכפי קיץ ארגונומיים" },
  { name: "נעלי לופר עור", categorySlug: "shoes", basePrice: 55900, description: "נעלי לופר אלגנטיות לכל מצב" },
  { name: "נעלי ריצה טכניות", categorySlug: "shoes", basePrice: 64900, description: "נעלי ריצה עם תמיכה מקסימלית" },
];

function pickSizes(categorySlug: string): string[] {
  if (categorySlug === "shoes") return ["36", "37", "38", "39", "40", "41", "42", "43", "44"];
  return SIZES;
}

function pickColors(i: number): string[] {
  const start = i % COLORS.length;
  const count = 2 + (i % 3);
  const result = [];
  for (let j = 0; j < count; j++) {
    result.push(COLORS[(start + j) % COLORS.length]);
  }
  return result;
}

async function main() {
  console.log("Seeding database...");

  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@fashion.co.il" },
    update: {},
    create: { email: "admin@fashion.co.il", password: adminHash, name: "מנהל ראשי", role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "user@fashion.co.il" },
    update: {},
    create: { email: "user@fashion.co.il", password: userHash, name: "לקוח לדוגמה", role: "USER" },
  });

  console.log(`Created users: admin (${admin.email}) + regular user`);

  // Categories
  const categoryMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = c.id;
  }
  console.log(`Created ${CATEGORIES.length} categories`);

  // Products + Variants
  let variantCount = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const slug = `${p.categorySlug}-${p.name.replace(/\s+/g, "-").replace(/[^\w-]/g, "")}-${i}`;
    const sizes = pickSizes(p.categorySlug);
    const colors = pickColors(i);

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        categoryId: categoryMap[p.categorySlug],
        name: p.name,
        slug,
        description: p.description,
        basePrice: p.basePrice,
        images: [`/images/product-${(i % 8) + 1}.jpg`],
        isActive: true,
      },
    });

    for (const size of sizes) {
      for (const color of colors) {
        const sku = `${p.categorySlug.toUpperCase()}-${i}-${size}-${color}`;
        await prisma.productVariant.upsert({
          where: { sku },
          update: {},
          create: {
            productId: product.id,
            sku,
            size,
            color,
            stock: 10 + Math.floor(Math.random() * 40),
          },
        });
        variantCount++;
      }
    }
  }

  console.log(`Created ${PRODUCTS.length} products with ${variantCount} variants`);
  console.log("\n✅ Seed complete!");
  console.log("  Admin: admin@fashion.co.il / admin123");
  console.log("  User:  user@fashion.co.il / user123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
