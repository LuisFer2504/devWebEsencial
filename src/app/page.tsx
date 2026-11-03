import { loadClientConfig } from "@/config/client-loader";
import { ProfessionalTheme } from "@/components/variants/ProfessionalTheme";
import { CommerceTheme } from "@/components/variants/CommerceTheme";
import { BeautyTheme } from "@/components/variants/BeautyTheme";
import { ArtistTheme } from "@/components/variants/ArtistTheme";

export default function HomePage() {
  const config = loadClientConfig();

  switch (config.variant) {
    case "commerce":
      return <CommerceTheme config={config} />;
    case "beauty":
      return <BeautyTheme config={config} />;
    case "artist":
      return <ArtistTheme config={config} />;
    case "professional":
    default:
      return <ProfessionalTheme config={config} />;
  }
}
