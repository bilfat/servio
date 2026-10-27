export default function Loading() {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[99999] pointer-events-none overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#0F4C81] via-sky-400 to-[#F43F5E] animate-pulse w-full" />
    </div>
  );
}
