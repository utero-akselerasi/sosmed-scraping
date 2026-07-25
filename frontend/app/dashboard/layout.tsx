import Sidebar from '@/components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8 mt-16 lg:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
