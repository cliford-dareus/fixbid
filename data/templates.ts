export interface Material {
    name: string;
    unit: string;
    avgCost: number;
    qty: number;
}

export interface JobTemplate {
    id: string;
    category: string;
    name: string;
    description: string;
    timeEstimateHours: number;
    laborRate: number;
    materials: Material[];
    commonUpsells: string[];
    regionalPremiums?: { region: string; multiplier: number }[];
    difficulty: "easy" | "medium" | "hard";
}

export const JOB_TEMPLATES: JobTemplate[] = [
    // DRYWALL
    {
        id: "drywall-patch-small",
        category: "Drywall",
        name: "Drywall Patch (Small, <6\")",
        description: "Patch small nail holes, screw pops, or minor dents in drywall.",
        timeEstimateHours: 1.5,
        laborRate: 85,
        difficulty: "easy",
        materials: [
            {name: "Joint compound", unit: "qt", avgCost: 8, qty: 1},
            {name: "Drywall tape", unit: "roll", avgCost: 5, qty: 1},
            {name: "Sandpaper (120-grit)", unit: "sheet", avgCost: 1, qty: 3},
            {name: "Primer", unit: "pt", avgCost: 7, qty: 1},
        ],
        commonUpsells: ["Paint matching", "Multiple patches (bundle discount)", "Texture matching"],
        regionalPremiums: [{region: "NYC/SF", multiplier: 1.4}],
    },
    {
        id: "drywall-patch-large",
        category: "Drywall",
        name: "Drywall Patch (Large, 6\"–24\")",
        description: "Replace and finish a larger section of drywall using a California patch or backing method.",
        timeEstimateHours: 3,
        laborRate: 85,
        difficulty: "medium",
        materials: [
            {name: "Drywall sheet (1/2\")", unit: "sheet", avgCost: 18, qty: 0.5},
            {name: "Joint compound", unit: "gal", avgCost: 15, qty: 1},
            {name: "Drywall tape", unit: "roll", avgCost: 5, qty: 1},
            {name: "Drywall screws", unit: "box", avgCost: 6, qty: 1},
            {name: "Sandpaper", unit: "sheet", avgCost: 1, qty: 5},
            {name: "Primer", unit: "qt", avgCost: 10, qty: 1},
        ],
        commonUpsells: ["Texture matching", "Paint entire wall", "Popcorn ceiling removal"],
        regionalPremiums: [{region: "NYC/SF", multiplier: 1.4}],
    },
    {
        id: "drywall-panel-replace",
        category: "Drywall",
        name: "Drywall Panel Replacement (Full Sheet)",
        description: "Remove and replace a full 4x8 sheet of drywall, tape, mud, and finish.",
        timeEstimateHours: 5,
        laborRate: 90,
        difficulty: "hard",
        materials: [
            {name: "Drywall sheet (1/2\")", unit: "sheet", avgCost: 18, qty: 2},
            {name: "Joint compound", unit: "gal", avgCost: 15, qty: 2},
            {name: "Drywall tape", unit: "roll", avgCost: 5, qty: 2},
            {name: "Drywall screws", unit: "box", avgCost: 6, qty: 1},
            {name: "Corner bead", unit: "pc", avgCost: 4, qty: 2},
        ],
        commonUpsells: ["Painting", "Insulation behind wall", "Water damage inspection"],
        regionalPremiums: [{region: "NYC/SF", multiplier: 1.45}],
    },

    // PLUMBING
    {
        id: "faucet-replace",
        category: "Plumbing",
        name: "Faucet Replacement",
        description: "Remove old faucet and install new customer-supplied or purchased faucet.",
        timeEstimateHours: 1.5,
        laborRate: 95,
        difficulty: "easy",
        materials: [
            {name: "Supply lines (pair)", unit: "set", avgCost: 12, qty: 1},
            {name: "Plumber's putty", unit: "tub", avgCost: 6, qty: 1},
            {name: "Teflon tape", unit: "roll", avgCost: 2, qty: 1},
        ],
        commonUpsells: ["Shut-off valve replacement", "Drain assembly upgrade", "P-trap inspection"],
        regionalPremiums: [],
    },
    {
        id: "toilet-repair",
        category: "Plumbing",
        name: "Toilet Repair (Running/Leaking)",
        description: "Diagnose and fix running toilet: replace flapper, fill valve, or flush handle.",
        timeEstimateHours: 1,
        laborRate: 95,
        difficulty: "easy",
        materials: [
            {name: "Flapper", unit: "ea", avgCost: 8, qty: 1},
            {name: "Fill valve", unit: "ea", avgCost: 15, qty: 1},
            {name: "Flush handle", unit: "ea", avgCost: 10, qty: 1},
            {name: "Wax ring (if needed)", unit: "ea", avgCost: 8, qty: 0},
        ],
        commonUpsells: ["Full toilet rebuild kit", "Toilet seat replacement", "Wax ring reseal"],
        regionalPremiums: [],
    },
    {
        id: "toilet-replace",
        category: "Plumbing",
        name: "Toilet Replacement",
        description: "Remove old toilet and install new unit. Customer supplies toilet.",
        timeEstimateHours: 2.5,
        laborRate: 100,
        difficulty: "medium",
        materials: [
            {name: "Wax ring", unit: "ea", avgCost: 8, qty: 1},
            {name: "Closet bolts", unit: "set", avgCost: 5, qty: 1},
            {name: "Supply line", unit: "ea", avgCost: 10, qty: 1},
            {name: "Caulk (white)", unit: "tube", avgCost: 5, qty: 1},
        ],
        commonUpsells: ["Haul-away old toilet", "Shut-off valve upgrade", "Floor inspection"],
        regionalPremiums: [],
    },
    {
        id: "garbage-disposal-replace",
        category: "Plumbing",
        name: "Garbage Disposal Replacement",
        description: "Remove old disposal and install new unit (1/2 or 3/4 HP).",
        timeEstimateHours: 1.5,
        laborRate: 95,
        difficulty: "easy",
        materials: [
            {name: "P-trap (if needed)", unit: "ea", avgCost: 12, qty: 0},
            {name: "Plumber's putty", unit: "tub", avgCost: 6, qty: 1},
            {name: "Wire nuts", unit: "bag", avgCost: 3, qty: 1},
        ],
        commonUpsells: ["Dishwasher knockout plug removal", "Power outlet install", "Deep clean under sink"],
        regionalPremiums: [],
    },
    {
        id: "drain-unclog",
        category: "Plumbing",
        name: "Drain Unclog (Sink/Tub)",
        description: "Clear a slow or clogged sink, tub, or shower drain.",
        timeEstimateHours: 0.75,
        laborRate: 95,
        difficulty: "easy",
        materials: [
            {name: "Drain snake/auger", unit: "use", avgCost: 0, qty: 1},
            {name: "Drain cleaner (enzyme)", unit: "ea", avgCost: 8, qty: 1},
        ],
        commonUpsells: ["Drain cover replacement", "P-trap clean", "Camera inspection"],
        regionalPremiums: [],
    },
    {
        id: "showerhead-replace",
        category: "Plumbing",
        name: "Showerhead Replacement",
        description: "Remove old showerhead and install new unit.",
        timeEstimateHours: 0.5,
        laborRate: 85,
        difficulty: "easy",
        materials: [
            {name: "Teflon tape", unit: "roll", avgCost: 2, qty: 1},
            {name: "Pipe joint compound", unit: "tube", avgCost: 5, qty: 0},
        ],
        commonUpsells: ["Shower arm replacement", "Water pressure check", "Caulk grout lines"],
        regionalPremiums: [],
    },

    // DOORS & WINDOWS
    {
        id: "door-hinge-fix",
        category: "Doors & Windows",
        name: "Door Hinge Repair",
        description: "Tighten, replace, or reposition sagging door hinges.",
        timeEstimateHours: 0.75,
        laborRate: 80,
        difficulty: "easy",
        materials: [
            {name: "Hinge screws (3\" long)", unit: "bag", avgCost: 4, qty: 1},
            {name: "Wood filler/toothpicks", unit: "ea", avgCost: 3, qty: 1},
            {name: "Replacement hinge", unit: "ea", avgCost: 8, qty: 0},
        ],
        commonUpsells: ["Door weatherstripping", "Door lock re-key", "Strike plate adjustment"],
        regionalPremiums: [],
    },
    {
        id: "door-install-interior",
        category: "Doors & Windows",
        name: "Interior Door Installation",
        description: "Hang a pre-hung interior door including plumb, shim, and trim.",
        timeEstimateHours: 3,
        laborRate: 90,
        difficulty: "medium",
        materials: [
            {name: "Shims", unit: "bundle", avgCost: 5, qty: 1},
            {name: "Finish nails", unit: "box", avgCost: 7, qty: 1},
            {name: "Door casing (set)", unit: "set", avgCost: 30, qty: 1},
            {name: "Wood filler", unit: "tube", avgCost: 5, qty: 1},
        ],
        commonUpsells: ["Lockset install", "Paint door", "Trim paint"],
        regionalPremiums: [{region: "NYC/SF", multiplier: 1.3}],
    },
    {
        id: "door-lock-replace",
        category: "Doors & Windows",
        name: "Door Lock/Deadbolt Replacement",
        description: "Remove old lock set and install new deadbolt or passage set.",
        timeEstimateHours: 1,
        laborRate: 85,
        difficulty: "easy",
        materials: [
            {name: "Strike plate screws", unit: "bag", avgCost: 3, qty: 1},
        ],
        commonUpsells: ["Smart lock upgrade", "Re-key all locks", "Door reinforcement plate"],
        regionalPremiums: [],
    },
    {
        id: "window-screen-repair",
        category: "Doors & Windows",
        name: "Window Screen Repair/Replace",
        description: "Re-screen existing frame or install new screen mesh.",
        timeEstimateHours: 0.75,
        laborRate: 75,
        difficulty: "easy",
        materials: [
            {name: "Screen mesh (per ft)", unit: "ft", avgCost: 1.5, qty: 10},
            {name: "Spline (per ft)", unit: "ft", avgCost: 0.5, qty: 10},
            {name: "Screen corner pieces", unit: "set", avgCost: 4, qty: 1},
        ],
        commonUpsells: ["All window screens", "Pet-proof screen upgrade", "Solar screen"],
        regionalPremiums: [{region: "Florida/Gulf Coast", multiplier: 1.15}],
    },
    {
        id: "window-caulk",
        category: "Doors & Windows",
        name: "Window Caulking (per window)",
        description: "Remove old failed caulk and apply fresh bead around window interior/exterior.",
        timeEstimateHours: 0.5,
        laborRate: 75,
        difficulty: "easy",
        materials: [
            {name: "Caulk (paintable)", unit: "tube", avgCost: 5, qty: 1},
            {name: "Caulk remover", unit: "tube", avgCost: 7, qty: 0.5},
        ],
        commonUpsells: ["All windows (bundle)", "Weatherstripping", "Exterior caulk (silicone)"],
        regionalPremiums: [{region: "Florida/Gulf Coast", multiplier: 1.25}],
    },

    // CARPENTRY & SHELVING
    {
        id: "shelf-install-floating",
        category: "Carpentry",
        name: "Floating Shelf Installation",
        description: "Install 1–2 floating shelves with stud-mount or toggle bolt anchoring.",
        timeEstimateHours: 1.5,
        laborRate: 85,
        difficulty: "easy",
        materials: [
            {name: "Toggle bolts", unit: "pack", avgCost: 8, qty: 1},
            {name: "Wall anchors", unit: "pack", avgCost: 5, qty: 1},
            {name: "Wood screws", unit: "box", avgCost: 5, qty: 1},
            {name: "Spackle (touch up)", unit: "tube", avgCost: 4, qty: 1},
        ],
        commonUpsells: ["Level guarantee", "Additional shelves (per unit)", "Bracket upgrade"],
        regionalPremiums: [],
    },
    {
        id: "tv-mount",
        category: "Carpentry",
        name: "TV Wall Mount Installation",
        description: "Mount flat-panel TV on drywall with stud attachment and cable management.",
        timeEstimateHours: 1.5,
        laborRate: 90,
        difficulty: "easy",
        materials: [
            {name: "Lag bolts", unit: "set", avgCost: 6, qty: 1},
            {name: "Cable raceways", unit: "kit", avgCost: 20, qty: 1},
            {name: "HDMI cable", unit: "ea", avgCost: 12, qty: 0},
        ],
        commonUpsells: ["In-wall cable concealment", "Power outlet behind TV", "Sound bar mount"],
        regionalPremiums: [],
    },
    {
        id: "cabinet-install",
        category: "Carpentry",
        name: "Cabinet Installation (per cabinet)",
        description: "Hang wall or base cabinet, level and secure to studs.",
        timeEstimateHours: 2,
        laborRate: 95,
        difficulty: "medium",
        materials: [
            {name: "Cabinet screws (3\")", unit: "box", avgCost: 8, qty: 1},
            {name: "Shims", unit: "bundle", avgCost: 5, qty: 1},
            {name: "Toggle bolts (if no stud)", unit: "pack", avgCost: 8, qty: 0},
        ],
        commonUpsells: ["Cabinet hardware install", "Soft-close hinges", "Under-cabinet lighting"],
        regionalPremiums: [{region: "NYC/SF", multiplier: 1.35}],
    },
    {
        id: "closet-rod-install",
        category: "Carpentry",
        name: "Closet Rod Installation",
        description: "Install closet rod and end brackets in standard reach-in closet.",
        timeEstimateHours: 0.75,
        laborRate: 75,
        difficulty: "easy",
        materials: [
            {name: "Closet rod (6ft)", unit: "ea", avgCost: 15, qty: 1},
            {name: "End brackets", unit: "pair", avgCost: 8, qty: 1},
            {name: "Wood screws", unit: "box", avgCost: 5, qty: 1},
        ],
        commonUpsells: ["Double-hang system", "Shelf above rod", "Full closet organizer"],
        regionalPremiums: [],
    },
    {
        id: "door-trim-install",
        category: "Carpentry",
        name: "Door/Window Trim Installation",
        description: "Miter, nail, and fill door or window casing trim.",
        timeEstimateHours: 2,
        laborRate: 85,
        difficulty: "medium",
        materials: [
            {name: "Pine casing (per LF)", unit: "LF", avgCost: 1.5, qty: 20},
            {name: "Finish nails", unit: "box", avgCost: 7, qty: 1},
            {name: "Wood filler", unit: "tube", avgCost: 5, qty: 1},
        ],
        commonUpsells: ["Prime and paint trim", "Baseboard match", "Crown moulding"],
        regionalPremiums: [],
    },

    // PAINTING
    {
        id: "room-paint-interior",
        category: "Painting",
        name: "Interior Room Paint (per room)",
        description: "Prep walls, apply 2 coats paint on walls (trim not included).",
        timeEstimateHours: 6,
        laborRate: 80,
        difficulty: "medium",
        materials: [
            {name: "Paint (1 gal)", unit: "gal", avgCost: 45, qty: 2},
            {name: "Primer (1 gal)", unit: "gal", avgCost: 30, qty: 1},
            {name: "Painter's tape", unit: "roll", avgCost: 6, qty: 2},
            {name: "Drop cloth", unit: "ea", avgCost: 8, qty: 2},
            {name: "Roller/tray", unit: "set", avgCost: 12, qty: 1},
        ],
        commonUpsells: ["Trim painting", "Ceiling painting", "Accent wall"],
        regionalPremiums: [{region: "NYC/SF", multiplier: 1.4}],
    },
    {
        id: "cabinet-paint",
        category: "Painting",
        name: "Kitchen Cabinet Painting",
        description: "Degrease, sand, prime, and paint cabinet doors/boxes (per 10 doors).",
        timeEstimateHours: 10,
        laborRate: 85,
        difficulty: "hard",
        materials: [
            {name: "Cabinet paint (qt)", unit: "qt", avgCost: 35, qty: 2},
            {name: "Bonding primer", unit: "qt", avgCost: 25, qty: 1},
            {name: "Deglosser", unit: "qt", avgCost: 12, qty: 1},
            {name: "Fine sandpaper (220)", unit: "sheet", avgCost: 1, qty: 10},
            {name: "Foam rollers", unit: "pack", avgCost: 8, qty: 1},
        ],
        commonUpsells: ["New hardware install", "Interior of cabinets", "Glass door painting"],
        regionalPremiums: [],
    },

    // ELECTRICAL (BASIC)
    {
        id: "outlet-replace",
        category: "Electrical",
        name: "Outlet Replacement (standard)",
        description: "Replace worn or failed standard duplex outlet.",
        timeEstimateHours: 0.5,
        laborRate: 95,
        difficulty: "easy",
        materials: [
            {name: "Duplex outlet", unit: "ea", avgCost: 5, qty: 1},
            {name: "Outlet cover plate", unit: "ea", avgCost: 2, qty: 1},
            {name: "Wire nuts", unit: "bag", avgCost: 3, qty: 1},
        ],
        commonUpsells: ["GFCI upgrade", "USB outlet upgrade", "Outlet cover upgrade"],
        regionalPremiums: [],
    },
    {
        id: "gfci-install",
        category: "Electrical",
        name: "GFCI Outlet Installation",
        description: "Install GFCI outlet in bathroom, kitchen, garage, or outdoor location.",
        timeEstimateHours: 0.75,
        laborRate: 100,
        difficulty: "easy",
        materials: [
            {name: "GFCI outlet", unit: "ea", avgCost: 18, qty: 1},
            {name: "Cover plate", unit: "ea", avgCost: 3, qty: 1},
        ],
        commonUpsells: ["Multiple GFCI (bundle)", "Tamper-resistant upgrade", "USB combo outlet"],
        regionalPremiums: [],
    },
    {
        id: "light-switch-replace",
        category: "Electrical",
        name: "Light Switch Replacement",
        description: "Replace standard toggle or dimmer switch.",
        timeEstimateHours: 0.5,
        laborRate: 90,
        difficulty: "easy",
        materials: [
            {name: "Toggle switch", unit: "ea", avgCost: 4, qty: 1},
            {name: "Cover plate", unit: "ea", qty: 1, avgCost: 2},
        ],
        commonUpsells: ["Dimmer upgrade", "Smart switch", "3-way switch"],
        regionalPremiums: [],
    },
    {
        id: "ceiling-fan-install",
        category: "Electrical",
        name: "Ceiling Fan Installation",
        description: "Install customer-supplied ceiling fan on existing junction box.",
        timeEstimateHours: 1.5,
        laborRate: 95,
        difficulty: "medium",
        materials: [
            {name: "Fan-rated brace (if needed)", unit: "ea", avgCost: 20, qty: 0},
            {name: "Wire nuts", unit: "bag", avgCost: 3, qty: 1},
        ],
        commonUpsells: ["Dimmer/remote add", "Fan brace upgrade", "Old fan disposal"],
        regionalPremiums: [],
    },
    {
        id: "light-fixture-replace",
        category: "Electrical",
        name: "Light Fixture Replacement",
        description: "Swap out existing light fixture with new customer-supplied fixture.",
        timeEstimateHours: 1,
        laborRate: 90,
        difficulty: "easy",
        materials: [
            {name: "Wire nuts", unit: "bag", avgCost: 3, qty: 1},
            {name: "Mounting hardware (if missing)", unit: "set", avgCost: 5, qty: 0},
        ],
        commonUpsells: ["Dimmer switch", "Multiple fixtures (bundle)", "Recessed lighting upgrade"],
        regionalPremiums: [],
    },

    // FLOORING
    {
        id: "tile-repair",
        category: "Flooring",
        name: "Tile Repair (per tile)",
        description: "Remove cracked tile and reset with matching grout and adhesive.",
        timeEstimateHours: 1.5,
        laborRate: 90,
        difficulty: "medium",
        materials: [
            {name: "Tile adhesive", unit: "lb", avgCost: 10, qty: 1},
            {name: "Grout (color match)", unit: "lb", avgCost: 8, qty: 1},
            {name: "Grout sealer", unit: "ea", avgCost: 10, qty: 0.5},
            {name: "Tile spacers", unit: "bag", avgCost: 4, qty: 1},
        ],
        commonUpsells: ["Regrout surrounding tiles", "Grout seal all tiles", "Multiple tiles (bundle)"],
        regionalPremiums: [],
    },
    {
        id: "laminate-repair",
        category: "Flooring",
        name: "Laminate Floor Repair (per plank)",
        description: "Replace individual damaged laminate planks.",
        timeEstimateHours: 2,
        laborRate: 85,
        difficulty: "medium",
        materials: [
            {name: "Laminate planks (extra)", unit: "sf", avgCost: 3, qty: 5},
            {name: "Tapping block", unit: "ea", avgCost: 8, qty: 1},
            {name: "Pull bar", unit: "ea", avgCost: 10, qty: 1},
        ],
        commonUpsells: ["Transition strip replacement", "Squeaky floor repair", "Underlayment fix"],
        regionalPremiums: [],
    },
    {
        id: "hardwood-floor-refinish",
        category: "Flooring",
        name: "Hardwood Floor Scratch Repair",
        description: "Sand, fill, and refinish scratched or dull hardwood floor section.",
        timeEstimateHours: 2,
        laborRate: 95,
        difficulty: "medium",
        materials: [
            {name: "Wood filler (color match)", unit: "tube", avgCost: 8, qty: 1},
            {name: "Sandpaper (various)", unit: "pack", avgCost: 10, qty: 1},
            {name: "Polyurethane (clear)", unit: "qt", avgCost: 18, qty: 1},
        ],
        commonUpsells: ["Full room refinish", "Area rug pad", "Grout/caulk edge"],
        regionalPremiums: [],
    },

    // HURRICANE PREP (Florida/Gulf/Southeast)
    {
        id: "hurricane-shutter-install",
        category: "Hurricane Prep",
        name: "Hurricane Shutter Installation (per window)",
        description: "Install accordion or panel hurricane shutters on existing tracks.",
        timeEstimateHours: 1,
        laborRate: 100,
        difficulty: "medium",
        materials: [
            {name: "Shutter bolts/pins", unit: "set", avgCost: 15, qty: 1},
            {name: "Track screws (stainless)", unit: "box", avgCost: 10, qty: 1},
        ],
        commonUpsells: ["All windows (bundle rate)", "Impact film alternative", "Shutter lube"],
        regionalPremiums: [
            {region: "Florida/Gulf Coast", multiplier: 1.3},
            {region: "Coastal SE", multiplier: 1.2},
        ],
    },
    {
        id: "hurricane-prep-general",
        category: "Hurricane Prep",
        name: "Hurricane Season Prep (home)",
        description: "Inspect and secure doors, shutters, garage door bracing, and yard anchors.",
        timeEstimateHours: 4,
        laborRate: 100,
        difficulty: "medium",
        materials: [
            {name: "Garage door brace kit", unit: "ea", avgCost: 85, qty: 1},
            {name: "Anchor bolts (SS)", unit: "box", avgCost: 20, qty: 1},
            {name: "Exterior caulk", unit: "tube", avgCost: 6, qty: 4},
        ],
        commonUpsells: ["Generator hookup check", "Roof vent covers", "Soffit inspection"],
        regionalPremiums: [
            {region: "Florida/Gulf Coast", multiplier: 1.35},
            {region: "Coastal SE", multiplier: 1.25},
        ],
    },
    {
        id: "garage-door-brace",
        category: "Hurricane Prep",
        name: "Garage Door Hurricane Brace",
        description: "Install horizontal bracing struts on single/double garage door.",
        timeEstimateHours: 2,
        laborRate: 95,
        difficulty: "medium",
        materials: [
            {name: "Horizontal brace kit", unit: "ea", avgCost: 120, qty: 1},
            {name: "Lag bolts", unit: "box", avgCost: 10, qty: 1},
        ],
        commonUpsells: ["All panels braced", "Wind load inspection", "Garage seal replacement"],
        regionalPremiums: [{region: "Florida/Gulf Coast", multiplier: 1.3}],
    },

    // MISC & MAINTENANCE
    {
        id: "weatherstripping-door",
        category: "Maintenance",
        name: "Door Weatherstripping Replacement",
        description: "Remove old and install new weatherstripping on exterior door (all 3 sides).",
        timeEstimateHours: 1,
        laborRate: 80,
        difficulty: "easy",
        materials: [
            {name: "Foam/V-seal weatherstrip", unit: "kit", avgCost: 12, qty: 1},
            {name: "Door sweep", unit: "ea", avgCost: 15, qty: 1},
        ],
        commonUpsells: ["All exterior doors", "Door threshold replacement", "Storm door adjust"],
        regionalPremiums: [],
    },
    {
        id: "caulk-bathroom",
        category: "Maintenance",
        name: "Bathroom Caulk Replacement",
        description: "Remove failed caulk around tub/shower surround and apply fresh silicone bead.",
        timeEstimateHours: 1.5,
        laborRate: 80,
        difficulty: "easy",
        materials: [
            {name: "Silicone caulk (tub/tile)", unit: "tube", avgCost: 8, qty: 2},
            {name: "Caulk remover", unit: "tube", avgCost: 7, qty: 1},
            {name: "Painter's tape", unit: "roll", avgCost: 5, qty: 1},
        ],
        commonUpsells: ["Grout sealing", "Shower door seal", "Sink caulk"],
        regionalPremiums: [],
    },
    {
        id: "grab-bar-install",
        category: "Accessibility",
        name: "Grab Bar Installation (per bar)",
        description: "Install ADA-compliant grab bar in shower or near toilet, stud-anchored.",
        timeEstimateHours: 1,
        laborRate: 90,
        difficulty: "easy",
        materials: [
            {name: "Stainless grab bar (18\"–36\")", unit: "ea", avgCost: 35, qty: 1},
            {name: "Lag bolts (SS)", unit: "set", avgCost: 6, qty: 1},
            {name: "Escutcheon plates", unit: "set", avgCost: 5, qty: 1},
        ],
        commonUpsells: ["Multiple bars (bundle)", "Blocking reinforcement", "Non-slip mat"],
        regionalPremiums: [],
    },
    {
        id: "attic-insulation-topup",
        category: "Insulation",
        name: "Attic Blown Insulation Top-Up",
        description: "Add blown cellulose or fiberglass to bring attic to R-38.",
        timeEstimateHours: 3,
        laborRate: 90,
        difficulty: "medium",
        materials: [
            {name: "Blown insulation (bag)", unit: "bag", avgCost: 18, qty: 15},
            {name: "Baffles (per rafter)", unit: "ea", avgCost: 1.5, qty: 10},
        ],
        commonUpsells: ["Air sealing", "Vapor barrier", "Hatch insulation"],
        regionalPremiums: [],
    },
    {
        id: "smoke-detector-replace",
        category: "Safety",
        name: "Smoke/CO Detector Replacement",
        description: "Replace battery or hardwired smoke/CO detector.",
        timeEstimateHours: 0.5,
        laborRate: 80,
        difficulty: "easy",
        materials: [
            {name: "Combo smoke/CO detector", unit: "ea", avgCost: 30, qty: 1},
            {name: "9V battery", unit: "ea", avgCost: 3, qty: 1},
        ],
        commonUpsells: ["Whole-home audit", "10-year sealed battery upgrade", "Interconnect wiring"],
        regionalPremiums: [],
    },
    {
        id: "gutter-clean",
        category: "Exterior",
        name: "Gutter Cleaning (per 100 LF)",
        description: "Clear debris from gutters and flush downspouts.",
        timeEstimateHours: 2,
        laborRate: 80,
        difficulty: "easy",
        materials: [
            {name: "Gutter scoop", unit: "use", avgCost: 0, qty: 1},
            {name: "Gutter guard (per ft)", unit: "ft", avgCost: 2, qty: 0},
        ],
        commonUpsells: ["Gutter guard install", "Downspout extension", "Fascia inspection"],
        regionalPremiums: [],
    },
    {
        id: "power-wash",
        category: "Exterior",
        name: "Power Washing (per 500 sqft)",
        description: "Pressure wash driveway, sidewalk, or exterior siding.",
        timeEstimateHours: 2,
        laborRate: 75,
        difficulty: "easy",
        materials: [
            {name: "Detergent/cleaner", unit: "gal", avgCost: 12, qty: 1},
        ],
        commonUpsells: ["Mold/mildew treatment", "Concrete sealing", "House wash"],
        regionalPremiums: [],
    },
    {
        id: "fence-repair",
        category: "Exterior",
        name: "Wood Fence Board Repair (per board)",
        description: "Replace rotted or broken fence pickets or rails.",
        timeEstimateHours: 1,
        laborRate: 80,
        difficulty: "easy",
        materials: [
            {name: "Cedar fence picket", unit: "ea", avgCost: 8, qty: 1},
            {name: "Galvanized nails/screws", unit: "box", avgCost: 6, qty: 0.25},
            {name: "Wood preservative", unit: "pt", avgCost: 8, qty: 0.5},
        ],
        commonUpsells: ["Paint/stain fence", "Post repair", "Gate hardware"],
        regionalPremiums: [],
    },
    {
        id: "deck-board-replace",
        category: "Exterior",
        name: "Deck Board Replacement (per board)",
        description: "Pull rotted deck board and install new pressure-treated replacement.",
        timeEstimateHours: 1,
        laborRate: 85,
        difficulty: "medium",
        materials: [
            {name: "PT lumber (5/4x6x12)", unit: "ea", avgCost: 22, qty: 1},
            {name: "Deck screws (stainless)", unit: "box", avgCost: 10, qty: 0.5},
        ],
        commonUpsells: ["Full deck stain", "Ledger inspection", "Joist check"],
        regionalPremiums: [],
    },
    {
        id: "stair-repair",
        category: "Carpentry",
        name: "Stair Tread Replacement (per tread)",
        description: "Replace cracked or broken interior/exterior stair tread.",
        timeEstimateHours: 1.5,
        laborRate: 90,
        difficulty: "medium",
        materials: [
            {name: "Oak stair tread", unit: "ea", avgCost: 35, qty: 1},
            {name: "Construction adhesive", unit: "tube", avgCost: 6, qty: 1},
            {name: "Finish screws", unit: "box", avgCost: 6, qty: 0.5},
        ],
        commonUpsells: ["All treads replace", "Squeaky stair fix", "Paint/stain"],
        regionalPremiums: [],
    },
    {
        id: "hvac-filter",
        category: "HVAC",
        name: "HVAC Filter Replacement",
        description: "Replace HVAC air filter and inspect unit. Up to 2 filters.",
        timeEstimateHours: 0.5,
        laborRate: 70,
        difficulty: "easy",
        materials: [
            {name: "HVAC filter (MERV-11)", unit: "ea", avgCost: 18, qty: 2},
        ],
        commonUpsells: ["Coil cleaning", "Drain pan check", "Annual service contract"],
        regionalPremiums: [],
    },
    {
        id: "water-heater-flush",
        category: "Plumbing",
        name: "Water Heater Flush & Inspect",
        description: "Flush sediment from tank, check anode rod, test pressure relief valve.",
        timeEstimateHours: 1,
        laborRate: 90,
        difficulty: "easy",
        materials: [
            {name: "Hose bib washers", unit: "bag", avgCost: 3, qty: 1},
            {name: "Teflon tape", unit: "roll", avgCost: 2, qty: 1},
        ],
        commonUpsells: ["Anode rod replacement", "Expansion tank check", "Insulation wrap"],
        regionalPremiums: [],
    },
];

export const CATEGORIES = [...new Set(JOB_TEMPLATES.map((t) => t.category))];

export function getTemplateById(id: string): JobTemplate | undefined {
    return JOB_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): JobTemplate[] {
    return JOB_TEMPLATES.filter((t) => t.category === category);
}

export function calculateJobCost(
    template: JobTemplate,
    materialMarkup: number = 1.2
): {
    labor: number;
    materials: number;
    total: number;
    suggested: number;
} {
    const labor = template.timeEstimateHours * template.laborRate;
    const materials = template.materials.reduce(
        (sum, m) => sum + m.avgCost * m.qty,
        0
    );
    const total = labor + materials * materialMarkup;
    const suggested = Math.ceil(total / 5) * 5; // Round to nearest $5
    return {labor, materials: materials * materialMarkup, total, suggested};
}
