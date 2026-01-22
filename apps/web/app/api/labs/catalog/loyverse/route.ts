import { NextResponse } from 'next/server';

const LOYVERSE_API_BASE = 'https://api.loyverse.com/v1.0';

interface LoyverseModifierOption {
  id: string;
  name: string;
  price: number;
}

interface LoyverseModifier {
  id: string;
  name: string;
  modifier_options: LoyverseModifierOption[];
  position?: number;
  stores?: string[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface LabTest {
  id: string;
  code: string;
  name: string;
  section: string;
  sectionId: string;
  price: number;
  loyverseModifierId: string;
  loyverseOptionId: string;
  specimenType: string;
  isQuickPick: boolean;
}

interface LabSection {
  id: string;
  name: string;
  code: string;
  tests: LabTest[];
}

// Map modifier names to specimen types
function inferSpecimenType(sectionName: string, testName: string): string {
  const lowerSection = sectionName.toLowerCase();
  const lowerTest = testName.toLowerCase();

  // Check test name first for specific specimens
  if (lowerTest.includes('urine') || lowerTest.includes('urinalysis')) return 'urine';
  if (lowerTest.includes('stool') || lowerTest.includes('fecal') || lowerTest.includes('feces'))
    return 'stool';
  if (lowerTest.includes('swab') || lowerTest.includes('culture')) return 'swab';
  if (lowerTest.includes('sputum')) return 'sputum';

  // Then check section
  if (lowerSection.includes('hematology')) return 'blood';
  if (lowerSection.includes('chemistry') || lowerSection.includes('chemical')) return 'blood';
  if (lowerSection.includes('serology')) return 'blood';
  if (lowerSection.includes('urinalysis') || lowerSection.includes('urine')) return 'urine';
  if (lowerSection.includes('fecal') || lowerSection.includes('stool')) return 'stool';
  if (lowerSection.includes('microbiology')) return 'swab';
  if (lowerSection.includes('drug')) return 'urine';

  return 'blood'; // Default to blood
}

// Generate a code from the test name
function generateCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word) => word.substring(0, 4))
    .join('_')
    .substring(0, 20);
}

// Map section names to standard lab section codes
function mapSectionCode(sectionName: string): string {
  const lower = sectionName.toLowerCase();
  if (lower.includes('hematology')) return 'hematology';
  if (lower.includes('chemistry') || lower.includes('chemical')) return 'chemistry';
  if (lower.includes('urinalysis') || lower.includes('urine')) return 'urinalysis';
  if (lower.includes('serology')) return 'serology';
  if (lower.includes('fecal') || lower.includes('stool')) return 'fecalysis';
  if (lower.includes('microbiology')) return 'microbiology';
  if (lower.includes('drug')) return 'drug_testing';
  return 'other';
}

/**
 * GET /api/labs/catalog/loyverse
 * Fetch lab tests from Loyverse - finds "Laboratory" item and extracts modifiers as test categories
 */
export async function GET() {
  try {
    const token = process.env.LOYVERSE_API_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'Loyverse API token not configured' }, { status: 500 });
    }

    // Fetch items from Loyverse
    console.log('[Lab Loyverse API] Fetching items from Loyverse...');
    const itemsResponse = await fetch(`${LOYVERSE_API_BASE}/items?limit=250`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!itemsResponse.ok) {
      const error = await itemsResponse.text();
      console.error('[Lab Loyverse API] Error fetching items:', error);
      return NextResponse.json(
        { error: `Loyverse API error: ${itemsResponse.status}` },
        { status: itemsResponse.status },
      );
    }

    const itemsData = await itemsResponse.json();
    const items = itemsData.items || [];

    console.log(`[Lab Loyverse API] Retrieved ${items.length} items from Loyverse`);
    console.log(
      '[Lab Loyverse API] Items:',
      JSON.stringify(
        items.map((item: any) => ({
          id: item.id,
          name: item.item_name,
          modifierIds: item.modifier_ids || [],
        })),
        null,
        2,
      ),
    );

    // Find the "Laboratory" item (case insensitive)
    const labItem = items.find(
      (item: any) =>
        item.item_name?.toLowerCase() === 'laboratory' ||
        item.item_name?.toLowerCase().includes('laboratory'),
    );

    if (!labItem) {
      console.log('[Lab Loyverse API] Laboratory item not found in Loyverse');
      return NextResponse.json({
        sections: [],
        tests: [],
        total: 0,
        message:
          'Laboratory item not found in Loyverse. Please create an item named "Laboratory" with modifiers for test categories.',
      });
    }

    console.log('[Lab Loyverse API] Found Laboratory item:', labItem.id);
    console.log(
      '[Lab Loyverse API] Laboratory item details:',
      JSON.stringify(
        {
          id: labItem.id,
          name: labItem.item_name,
          modifierIds: labItem.modifier_ids || [],
        },
        null,
        2,
      ),
    );

    // Get modifier IDs from the item
    const modifierIds = labItem.modifier_ids || [];

    if (modifierIds.length === 0) {
      console.log('[Lab Loyverse API] Laboratory item has no modifiers');
      return NextResponse.json({
        sections: [],
        tests: [],
        total: 0,
        message:
          'Laboratory item has no modifiers. Add modifiers to represent test categories (e.g., Hematology, Chemistry).',
      });
    }

    // Fetch each modifier to get its options (tests)
    const sections: LabSection[] = [];
    const allTests: LabTest[] = [];

    for (const modId of modifierIds) {
      try {
        const modResponse = await fetch(`${LOYVERSE_API_BASE}/modifiers/${modId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!modResponse.ok) {
          console.error(
            `[Lab Loyverse API] Failed to fetch modifier ${modId}:`,
            modResponse.status,
          );
          continue;
        }

        const modifier: LoyverseModifier = await modResponse.json();
        const sectionCode = mapSectionCode(modifier.name);
        const options = modifier.modifier_options || [];

        console.log(
          `[Lab Loyverse API] Modifier "${modifier.name}" (${modifier.id}) has ${options.length} options`,
        );
        console.log(
          '[Lab Loyverse API] Modifier details:',
          JSON.stringify(
            {
              id: modifier.id,
              name: modifier.name,
              sectionCode,
              options: options.map((opt: any) => ({
                id: opt.id,
                name: opt.name,
                price: opt.price,
              })),
            },
            null,
            2,
          ),
        );

        const tests: LabTest[] = options.map((opt: any, index: number) => ({
          id: opt.id,
          code: generateCode(opt.name),
          name: opt.name,
          section: modifier.name,
          sectionId: modifier.id,
          sectionCode,
          price: opt.price || 0,
          loyverseModifierId: modifier.id,
          loyverseOptionId: opt.id,
          specimenType: inferSpecimenType(modifier.name, opt.name),
          isQuickPick: index < 5, // First 5 tests in each section are quick picks
          sortOrder: index,
        }));

        sections.push({
          id: modifier.id,
          name: modifier.name,
          code: sectionCode,
          tests,
        });

        allTests.push(...tests);
      } catch (error) {
        console.error(`[Lab Loyverse API] Error fetching modifier ${modId}:`, error);
      }
    }

    console.log(
      `[Lab Loyverse API] Found ${sections.length} sections with ${allTests.length} total tests`,
    );

    return NextResponse.json({
      sections,
      tests: allTests,
      total: allTests.length,
      loyverseItemId: labItem.id,
      loyverseItemName: labItem.item_name,
    });
  } catch (error) {
    console.error('[Lab Loyverse API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lab tests from Loyverse' }, { status: 500 });
  }
}
