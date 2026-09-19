import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { SidebarProvider } from "../../components/SidebarContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh bg-alita-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="min-h-0 min-w-0 flex-1 p-3 sm:p-4 lg:p-8 overflow-y-auto bg-alita-gray-50 flex flex-col">
            <div className="flex-1 min-w-0">
              {children}
            </div>
            <footer className="mt-8 pt-4 border-t border-alita-gray-100/50 flex flex-col sm:flex-row justify-between items-center gap-2">
              <p className="text-[10px] font-bold text-alita-gray-400 uppercase tracking-widest leading-none">
                © 2026 PT Alita Praya Mitra
              </p>
              <p className="text-[10px] font-bold text-alita-gray-300 uppercase tracking-widest leading-none">
                Developed with <span className="text-red-400">❤️</span> by <span className="text-alita-gray-500">IT Apps Team</span>
              </p>
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
