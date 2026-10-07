import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "Ang mga patakaran sa paggamit ng Poopipoo at pag-ambag ng CR at review.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="Oktubre 2026">
      <p>Sa paggamit ng Poopipoo, sumasang-ayon ka sa mga sumusunod.</p>

      <h2>Mga ambag mo</h2>
      <ul>
        <li>Mag-add lang ng totoong CR na alam mo, na may tamang lokasyon.</li>
        <li>Maging magalang sa reviews. Bawal ang hate speech, spam, at personal na impormasyon ng ibang tao.</li>
        <li>Huwag mag-add o mag-review para lang makakuha ng points. Pwedeng burahin ang pekeng ambag at ang points nito.</li>
        <li>Ang mga CR at review na in-add mo ay makikita ng lahat ng gumagamit ng app.</li>
      </ul>

      <h2>Walang garantiya</h2>
      <p>
        Galing sa komunidad ang impormasyon, kaya pwedeng luma o mali ito (hal. sarado na ang CR o may bayad na).
        Gamitin ang sariling pag-iingat, lalo na sa direksyon at sa daan.
      </p>

      <h2>AI assistant</h2>
      <p>
        Ang sagot ng AI assistant ay batay sa mga CR sa database, pero pwede pa rin itong magkamali. I-check ang
        detalye ng CR bago pumunta.
      </p>

      <h2>Mga pagbabago</h2>
      <p>Pwedeng ma-update ang mga patakarang ito. Ipapakita rito ang petsa ng huling update.</p>
    </LegalPage>
  );
}
