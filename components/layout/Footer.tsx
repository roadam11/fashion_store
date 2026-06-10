import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">FASHION</h3>
            <p className="text-sm">חנות האופנה שלך לכל עונה.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">קטגוריות</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?category=shirts" className="hover:text-white transition-colors">חולצות</Link></li>
              <li><Link href="/products?category=pants" className="hover:text-white transition-colors">מכנסיים</Link></li>
              <li><Link href="/products?category=dresses" className="hover:text-white transition-colors">שמלות</Link></li>
              <li><Link href="/products?category=jackets" className="hover:text-white transition-colors">ז׳קטים</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">שירות לקוחות</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/account" className="hover:text-white transition-colors">החשבון שלי</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">עגלת קניות</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">צור קשר</h4>
            <p className="text-sm">info@fashion.co.il</p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-xs">
          © {new Date().getFullYear()} Fashion Store. כל הזכויות שמורות.
        </div>
      </div>
    </footer>
  );
}
