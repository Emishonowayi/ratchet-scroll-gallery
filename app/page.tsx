import CornerNav from "./components/CornerNav";
import WorkCarousel from "./components/WorkCarousel";

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-[#f0f0f0]">
      <CornerNav />
      <WorkCarousel />
    </main>
  );
}
