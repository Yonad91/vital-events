// Amharic-first Ethiopia admin divisions (subset; extend as needed)
// If a full dataset is loaded into window.ETH_GEO_DATA (from /geo/ethiopia-admin.json), prefer that.
// This allows dropdowns to show complete Regions → Zones → Woredas without changing component code.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const RUNTIME_ETH_GEO = typeof window !== "undefined" ? window.ETH_GEO_DATA : null;

export const ETH_GEO = RUNTIME_ETH_GEO || {
  "አዲስ አበባ": { zones: { "ከተማ": { woredas: ["አራዳ","ቦሌ","ጉልሌ","ከልፌ-ከክሮስ","ንፋስ-ስልክ","የካ"] } } },
  "ድሬዳዋ": { zones: { "ከተማ": { woredas: ["ድሬዳዋ ከተማ"] } } },

  "ኦሮሚያ": { zones: {
    "ምእራብ ሾዋ": { woredas: ["አምቦ","መንዴ ኵርሬ","ወለሱ","ጎጆ"] },
    "ምሥራቅ ሾዋ": { woredas: ["አዳማ","መታራ","ቦሪча"] },
    "ደቡብ ሾዋ": { woredas: ["ዳቦራ ብሬና","ብቻ","ቡቢ ዐለ"] },
    "ዋለጋ": { woredas: ["ኒኬምቴ","ጎምቤ","ሳሳጎ"] },
  }},

  "አማራ": { zones: {
    "ሰሜን ጎንደር": { woredas: ["ጎንደር ከተማ","ደብረ ታቦር","ዳንግላ"] },
    "ደቡብ ጎንደር": { woredas: ["ዘጋ","ጉቡ"] },
    "ሰሜን ወሎ": { woredas: ["ደሴ","ዱሲ"] },
    "ደቡብ ወሎ": { woredas: ["ኮምቦልቻ","ዳላ"] },
    "ባሕር ዳር ከተማ": { woredas: ["ባሕር ዳር"] },
  }},

  "ትግራይ": { zones: {
    "ሰሜን ትግራይ": { woredas: ["አክሱም","ሽራሮ"] },
    "ማቅአለ": { woredas: ["ማቅአለ ከተማ"] },
    "ደቡብ ትግራይ": { woredas: ["ሀዋዝን","አላማታ"] },
  }},

  "ደቡብ (SNNP)": { zones: {
    "ሲዳማ": { woredas: ["ሶዳ","ደቡብ አሌታ"] },
    "ጉራጌ": { woredas: ["ዘይታ","ወልቂታ"] },
    "ሀዲያ": { woredas: ["ሆሃዲያ","ሙዳ አባይ"] },
  }},

  "ሶማሌ": { zones: {
    "ፈር ኦጋዳን": { woredas: ["ጂጂጋ","ቡስል"] },
    "ኦና": { woredas: ["ጋራኢ","ሽኒል"] },
  }},

  "አፋር": { zones: {
    "Zone 1": { woredas: ["ሴሙሮቲ","አስዒታ"] },
    "Zone 2": { woredas: ["ኮና","ኤርባቲ"] },
  }},

  "ቤኒሻንጉል-ጉሙዝ": { zones: {
    "አሲሳ": { woredas: ["አሲሳ","ዲሚጎ"] },
    "ማትኬል": { woredas: ["ጊማሽ","ፊልጋ"] },
  }},

  "ጋምቤላ": { zones: { "ክልል": { woredas: ["ጋምቤላ ከተማ","ኦንጎ"] } } },
  "ሀረር": { zones: { "ክልል": { woredas: ["ሀረር ከተማ"] } } },
};