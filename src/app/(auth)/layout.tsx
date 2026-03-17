export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0b1a] via-[#1a0d2e] to-[#0d0b1a]">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
