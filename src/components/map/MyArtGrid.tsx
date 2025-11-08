// src/components/map/MyArtGrid.tsx

// 🔸 지금은 정적 이미지 10장만 표시하는 버전입니다 (스토어 사용 X)
export default function MyArtGrid() {
    const STATIC_ARTS = [
      { id: "kr-01", title: "Gilt Bodhisattva",       url: "/MapTabPics/gilt_bodhisattva_statue.jpeg" },
      { id: "kr-02", title: "Ecriture (Park Seo-Bo)", url: "/MapTabPics/ecriture_parkseobo.jpeg" },
      { id: "kr-03", title: "Lady in Yellow",         url: "/MapTabPics/lady_in_yellow_leeinseong.jpeg" },
      { id: "kr-04", title: "Universe (Kim Whanki)",  url: "/MapTabPics/universe_kimwhanki.jpeg" },
      { id: "kr-05", title: "Space (Lee Ufan)",       url: "/MapTabPics/space_leewoo-hwan.jpeg" },
      { id: "mo-01", title: "Starry Night",           url: "/MapTabPics/starry_night_vangogh.jpeg" },
      { id: "jp-01", title: "Dancing Haniwa",         url: "/MapTabPics/dancing_haniwa.jpeg" },
      { id: "fr-01", title: "Mona Lisa",              url: "/MapTabPics/mona_lisa_davinci.jpeg" },
      { id: "at-01", title: "Hunters in the Snow",    url: "/MapTabPics/hunters_in_the_snow_breughel.jpeg" },
      { id: "uk-01", title: "Whaam!",                 url: "/MapTabPics/whaam_lichtenstein.jpeg" },
    ];
  
    return (
      <div className="grid grid-cols-3 gap-[6px]">
        {STATIC_ARTS.map((it) => (
          <button
            key={it.id}
            className="relative aspect-square rounded-md overflow-hidden bg-neutral-800"
            onClick={() => alert(it.title)}
            title={it.title}
          >
            <img
              src={it.url}
              alt={it.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
            />
          </button>
        ))}
      </div>
    );
  }