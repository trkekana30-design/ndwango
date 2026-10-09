import logo from "@/assets/ndwango-logo.png.asset.json";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src={logo.url} alt="Ndwango" className={className} />;
}
