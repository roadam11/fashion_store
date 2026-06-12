import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const Q = "?w=900&q=80&auto=format&fit=crop";
const U = "https://images.unsplash.com/photo-";

const CATEGORIES = [
  { name: "חולצות", slug: "shirts", description: "חולצות לגבר ואישה" },
  { name: "מכנסיים", slug: "pants", description: "מכנסיים לכל מצב" },
  { name: "שמלות", slug: "dresses", description: "שמלות לכל אירוע" },
  { name: "ז'קטים", slug: "jackets", description: "ז'קטים ומעילים" },
  { name: "נעליים", slug: "shoes", description: "נעליים ואביזרים" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = ["שחור", "לבן", "כחול", "אדום", "ירוק", "אפור", "בז'"];

const PRODUCTS: { name: string; categorySlug: string; basePrice: number; description: string; images: string[] }[] = [
  // חולצות
  {
    name: "חולצת כותנה קלאסית", categorySlug: "shirts", basePrice: 12900,
    description: "חולצת כותנה נוחה ואיכותית לכל יום",
    images: [`${U}1596755094514-f87e34085b2c${Q}`, `${U}1598032895397-88a1e62be5e5${Q}`],
  },
  {
    name: "חולצת פולו פרימיום", categorySlug: "shirts", basePrice: 18900,
    description: "חולצת פולו ייצוגית עם שרוולים קצרים",
    images: [`${U}1571945153237-4929e783af4a${Q}`, `${U}1548126032-079a0fb74f4f${Q}`],
  },
  {
    name: "חולצת פסים נאוטי", categorySlug: "shirts", basePrice: 15900,
    description: "חולצת פסים בסגנון ימי קלאסי",
    images: [`${U}1489987707025-afc232f7ea0f${Q}`, `${U}1576566588028-4147f3842f27${Q}`],
  },
  {
    name: "חולצת אוברסייז אורבנית", categorySlug: "shirts", basePrice: 14900,
    description: "חולצה עם גזרת אוברסייז מודרנית",
    images: [`${U}1583743814966-8d4d0ec5e62e${Q}`, `${U}1551537994-ac88-4e2c-9d42-a45ba85cbe4d${Q}`],
  },
  {
    name: "חולצת לינן קיץ", categorySlug: "shirts", basePrice: 16900,
    description: "חולצת פשתן קלילה לימות הקיץ",
    images: [`${U}1523381294911-8d536a4abad1${Q}`, `${U}1602810318383-e386cc2a3ccf${Q}`],
  },
  // מכנסיים
  {
    name: "ג'ינס סלים קלאסי", categorySlug: "pants", basePrice: 29900,
    description: "ג'ינס בגזרת סלים עם שטיפה בהירה",
    images: [`${U}1542272604-787c3835535d${Q}`, `${U}1475178626620-a4d074967452${Q}`],
  },
  {
    name: "מכנסי צ'ינו בז'", categorySlug: "pants", basePrice: 24900,
    description: "מכנסי צ'ינו אלגנטיים לשעות הפנאי",
    images: [`${U}1624378439575-d8705ad7ae80${Q}`, `${U}1554568218-0f1715e72254${Q}`],
  },
  {
    name: "מכנסי טרנינג פרמיום", categorySlug: "pants", basePrice: 19900,
    description: "מכנסי ספורט נוחים לאימון ולבית",
    images: [`${U}1556906781-9b4d1b44f99a${Q}`, `${U}1517466937-dec9f57a4d3b${Q}`],
  },
  {
    name: "ג'ינס וואיד לג", categorySlug: "pants", basePrice: 31900,
    description: "ג'ינס רחב ברגל בסגנון רטרו",
    images: [`${U}1598554747436-c9293d6a588f${Q}`, `${U}1541099649105-f69ad21f3246${Q}`],
  },
  {
    name: "מכנסי קרגו טקטי", categorySlug: "pants", basePrice: 27900,
    description: "מכנסי קרגו עם כיסים מרובים",
    images: [`${U}1566275529824-cca6d008f3da${Q}`, `${U}1473966968600-fa4cbed523f1${Q}`],
  },
  // שמלות
  {
    name: "שמלת מידי קיץ", categorySlug: "dresses", basePrice: 32900,
    description: "שמלת מידי פרחונית לעונת הקיץ",
    images: [`${U}1595777457583-95e059d581b8${Q}`, `${U}1496747611176-843222e1e57c${Q}`, `${U}1515886657613-9f3515b0c78f${Q}`],
  },
  {
    name: "שמלת קוקטייל שחורה", categorySlug: "dresses", basePrice: 45900,
    description: "שמלה אלגנטית לאירועי ערב",
    images: [`${U}1566479179817-c0b3e3ad9b3a${Q}`, `${U}1551803091-e20673f15770${Q}`, `${U}1509631179647-0177331693ae${Q}`],
  },
  {
    name: "שמלת בוהו מקסי", categorySlug: "dresses", basePrice: 38900,
    description: "שמלת מקסי בסגנון בוהו שיק",
    images: [`${U}1585487000160-6ebcfceb0d03${Q}`, `${U}1572804013309-59a88b7e92f1${Q}`],
  },
  {
    name: "שמלת ראפל רומנטית", categorySlug: "dresses", basePrice: 28900,
    description: "שמלה עם גדילים בגזרה נשית",
    images: [`${U}1518611012118-696072aa579a${Q}`, `${U}1502716119720-483b59c88e39${Q}`],
  },
  {
    name: "שמלת ג'ינס קז'ואל", categorySlug: "dresses", basePrice: 26900,
    description: "שמלת ג'ינס לסגנון יומיומי",
    images: [`${U}1496747611176-843222e1e57c${Q}`, `${U}1562157873-818bc0726f68${Q}`],
  },
  // ז'קטים
  {
    name: "ז'קט עור מלאכותי", categorySlug: "jackets", basePrice: 59900,
    description: "ז'קט עור בסגנון רוק קלאסי",
    images: [`${U}1551028719-00167b16eac5${Q}`, `${U}1596993100471-c3905dafa78e${Q}`, `${U}1520975916090-3105956dac38${Q}`],
  },
  {
    name: "ברדס בומבר", categorySlug: "jackets", basePrice: 42900,
    description: "ז'קט בומבר עם כיסים רוכסן",
    images: [`${U}1591047139829-d91aecb6caea${Q}`, `${U}1559501700-4b2d75aeb7c7${Q}`],
  },
  {
    name: "מעיל טרנץ' קלאסי", categorySlug: "jackets", basePrice: 89900,
    description: "מעיל טרנץ' לעונות המעבר",
    images: [`${U}1520975916090-3105956dac38${Q}`, `${U}1548142813-1517d9b6b870${Q}`, `${U}1544441893-675173071203${Q}`],
  },
  {
    name: "חליפת קורדרוי", categorySlug: "jackets", basePrice: 52900,
    description: "ז'קט קורדרוי ביג'י",
    images: [`${U}1611312449408-fcedd27265f8${Q}`, `${U}1617952236317-0bd127407984${Q}`],
  },
  {
    name: "ברדס פליס חורפי", categorySlug: "jackets", basePrice: 34900,
    description: "ברדס פליס חם ונוח לחורף",
    images: [`${U}1578768079052-aa76e52ff9ea${Q}`, `${U}1556821840-3a63f8d3e9f2${Q}`],
  },
  // נעליים
  {
    name: "סניקרס לבן קלאסי", categorySlug: "shoes", basePrice: 39900,
    description: "סניקרס לבן נקי לסגנון יומיומי",
    images: [`${U}1542291026-7eec264c27ff${Q}`, `${U}1525966222134-fcfa99b8ae77${Q}`, `${U}1539185065-5d4ab0f7d6e8${Q}`],
  },
  {
    name: "מגפי קובן שחור", categorySlug: "shoes", basePrice: 72900,
    description: "מגפי עקב קובן בעור פרמיום",
    images: [`${U}1605812860427-4024433a70fd${Q}`, `${U}1543163521-1bf539c55dd2${Q}`],
  },
  {
    name: "כפכפי בירקנשטוק", categorySlug: "shoes", basePrice: 29900,
    description: "כפכפי קיץ ארגונומיים",
    images: [`${U}1562183241-b937e95585b6${Q}`, `${U}1603487742131-4160ec999306${Q}`],
  },
  {
    name: "נעלי לופר עור", categorySlug: "shoes", basePrice: 55900,
    description: "נעלי לופר אלגנטיות לכל מצב",
    images: [`${U}1614252235316-8c857d38b5f4${Q}`, `${U}1533867522750-1c5a11a50b63${Q}`, `${U}1617952236317-0bd127407984${Q}`],
  },
  {
    name: "נעלי ריצה טכניות", categorySlug: "shoes", basePrice: 64900,
    description: "נעלי ריצה עם תמיכה מקסימלית",
    images: [`${U}1542291026-7eec264c27ff${Q}`, `${U}1460353581641-37baddab0fa2${Q}`],
  },
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

  let variantCount = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const slug = `${p.categorySlug}-${p.name.replace(/\s+/g, "-").replace(/[^\w-]/g, "")}-${i}`;
    const sizes = pickSizes(p.categorySlug);
    const colors = pickColors(i);

    const productData = {
      categoryId: categoryMap[p.categorySlug],
      name: p.name,
      slug,
      description: p.description,
      basePrice: p.basePrice,
      images: p.images,
      isActive: true,
    };

    const product = await prisma.product.upsert({
      where: { slug },
      update: { images: p.images }, // update images on re-seed
      create: productData,
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
