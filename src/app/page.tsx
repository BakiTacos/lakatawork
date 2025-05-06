import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const navigationItems = [
    {
      title: "Products",
      icon: "/product.svg",
      href: "/products/1",
      description: "Manage Products"
    },
    {
      title: "Inventory",
      icon: "/warehouse.svg",
      href: "/inventory/1",
      description: "Manage Products Stocks"
    },
    {
      title: "Purchase",
      icon: "/purchase.svg",
      href: "/purchase",
      description: "Manage Product Purchases"
    },
    {
      title: "Tasks",
      icon: "/tasks.svg",
      href: "/tasks",
      description: "View and manage Tasks"
    },
    {
      title: "Suppliers",
      icon: "/supplier.svg",
      href: "/suppliers/1",
      description: "Manage Suppliers"
    },
    {
      title: "Profile",
      icon: "/profile.svg",
      href: "/profile",
      description: "Manage your profile"
    }
  ];

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center sm:text-left"></h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="p-6 border border-black/[.08] dark:border-white/[.08] rounded-xl hover:bg-black/[.02] dark:hover:bg-white/[.02] transition-colors group"
            >
              <div className="flex flex-col items-center text-center h-full justify-between gap-4">
                <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-black/[.05] dark:bg-white/[.05] group-hover:bg-black/[.08] dark:group-hover:bg-white/[.08] transition-colors">
                  <Image
                    src={item.icon}
                    alt={`${item.title} icon`}
                    width={32}
                    height={32}
                    className="dark:invert"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                  <p className="text-sm text-black/60 dark:text-white/60">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
