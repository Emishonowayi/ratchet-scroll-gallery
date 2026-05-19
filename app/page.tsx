import CornerNav from "./components/CornerNav";
import WorkCarousel from "./components/WorkCarousel";
import IntroScreen from "./components/IntroScreen";

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-[#f0f0f0]">
      <CornerNav />
      <WorkCarousel />
      <IntroScreen />
    </main>
  );
}
