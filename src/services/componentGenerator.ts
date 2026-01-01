/**
 * Component Code Generator
 * 
 * Transforms Vision AI analysis into production-ready React/TypeScript code
 * with Tailwind CSS styling.
 */

import type { VisionAnalysisResult, ComponentDescription } from './visionAnalyzer';

export interface GeneratedComponent {
  name: string;
  code: string;
  filePath: string;
}

/**
 * Convert hex color to Tailwind class if possible
 */
function hexToTailwindColor(hex: string): string | null {
  const colorMap: Record<string, string> = {
    '#FFFFFF': 'white',
    '#000000': 'black',
    '#3B82F6': 'blue-500',
    '#EF4444': 'red-500',
    '#10B981': 'green-500',
    '#F59E0B': 'yellow-500',
    '#8B5CF6': 'purple-500',
    '#EC4899': 'pink-500',
    '#06B6D4': 'cyan-500',
    '#6366F1': 'indigo-500',
  };

  return colorMap[hex.toUpperCase()] || null;
}

/**
 * Convert inline styles to Tailwind classes
 */
function stylesToTailwind(styles: ComponentDescription['styles']): string {
  const classes: string[] = [];

  if (styles.backgroundColor) {
    const twColor = hexToTailwindColor(styles.backgroundColor);
    if (twColor) {
      classes.push(`bg-${twColor}`);
    } else {
      classes.push(`bg-[${styles.backgroundColor}]`);
    }
  }

  if (styles.textColor) {
    const twColor = hexToTailwindColor(styles.textColor);
    if (twColor) {
      classes.push(`text-${twColor}`);
    } else {
      classes.push(`text-[${styles.textColor}]`);
    }
  }

  if (styles.fontSize) {
    const sizeMap: Record<string, string> = {
      '12px': 'text-xs',
      '14px': 'text-sm',
      '16px': 'text-base',
      '18px': 'text-lg',
      '20px': 'text-xl',
      '24px': 'text-2xl',
      '32px': 'text-3xl',
    };
    classes.push(sizeMap[styles.fontSize] || `text-[${styles.fontSize}]`);
  }

  if (styles.fontWeight) {
    const weightMap: Record<string, string> = {
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
    };
    classes.push(weightMap[styles.fontWeight] || 'font-normal');
  }

  if (styles.borderRadius) {
    const radiusMap: Record<string, string> = {
      '4px': 'rounded',
      '8px': 'rounded-lg',
      '12px': 'rounded-xl',
      '16px': 'rounded-2xl',
      '9999px': 'rounded-full',
    };
    classes.push(radiusMap[styles.borderRadius] || `rounded-[${styles.borderRadius}]`);
  }

  if (styles.padding) {
    const paddingMap: Record<string, string> = {
      '8px': 'p-2',
      '12px': 'p-3',
      '16px': 'p-4',
      '24px': 'p-6',
      '12px 24px': 'px-6 py-3',
    };
    classes.push(paddingMap[styles.padding] || 'p-4');
  }

  return classes.join(' ');
}

/**
 * Generate JSX for a single component
 */
function generateComponentJSX(comp: ComponentDescription, idx: number): string {
  const classes = stylesToTailwind(comp.styles);

  switch (comp.type) {
    case 'button':
      return `<button className="${classes}"${comp.props?.onClick ? ` onClick={${comp.props.onClick}}` : ''}>
        ${comp.content || 'Button'}
      </button>`;

    case 'input':
      return `<input 
        type="text" 
        placeholder="${comp.content || 'Enter text...'}"
        className="${classes}"
      />`;

    case 'text':
      return `<p className="${classes}">${comp.content || 'Text content'}</p>`;

    case 'image':
      return `<img 
        src="${comp.props?.src || '/placeholder.png'}" 
        alt="${comp.props?.alt || 'Image'}"
        className="${classes}"
      />`;

    case 'card':
      return `<div className="${classes}">
        {/* Card content */}
      </div>`;

    case 'container':
      return `<div className="${classes}">
        {/* Container content */}
      </div>`;

    case 'icon':
      return `<div className="${classes}">
        {/* Icon placeholder */}
      </div>`;

    case 'link':
      return `<a href="${comp.props?.href || '#'}" className="${classes}">
        ${comp.content || 'Link'}
      </a>`;

    default:
      return `<div className="${classes}">Component ${idx}</div>`;
  }
}

/**
 * Generate complete React component from analysis
 */
export function generateComponent(
  componentName: string,
  analysis: VisionAnalysisResult
): GeneratedComponent {
  const { layout, components, typography, spacing } = analysis;

  const layoutClass = {
    'flex-row': 'flex flex-row',
    'flex-col': 'flex flex-col',
    'grid': 'grid',
    'absolute': 'relative',
  }[layout] || 'flex flex-col';

  const gapClass = spacing.componentGap === '16px' ? 'gap-4' : 'gap-6';
  const paddingClass = spacing.containerPadding === '24px' ? 'p-6' : 'p-4';

  const componentJSX = components
    .map((comp, idx) => `        ${generateComponentJSX(comp, idx)}`)
    .join('\n\n');

  const code = `import React from 'react';

interface ${componentName}Props {
  // Add props as needed
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <div className="${layoutClass} ${gapClass} ${paddingClass}">
${componentJSX}
    </div>
  );
};
`;

  const filePath = `src/components/Generated/${componentName}.tsx`;

  return {
    name: componentName,
    code,
    filePath,
  };
}

/**
 * Generate TypeScript props interface from component descriptions
 */
export function generatePropsInterface(
  componentName: string,
  components: ComponentDescription[]
): string {
  const props: string[] = [];

  components.forEach((comp) => {
    if (comp.props) {
      Object.entries(comp.props).forEach(([key, value]) => {
        if (!props.includes(key)) {
          const type = key.startsWith('on') ? '() => void' : 'string';
          props.push(`  ${key}?: ${type};`);
        }
      });
    }
  });

  if (props.length === 0) {
    return `export interface ${componentName}Props {}\n`;
  }

  return `export interface ${componentName}Props {\n${props.join('\n')}\n}\n`;
}

/**
 * Extract color palette as CSS custom properties
 */
export function generateColorPalette(colors: string[]): string {
  return colors
    .map((color, idx) => `  --color-${idx + 1}: ${color};`)
    .join('\n');
}

/**
 * Save generated component to file system with conflict detection
 * 
 * R-007 Integration: Uses backend file management APIs
 */
export async function saveGeneratedComponent(
  component: GeneratedComponent,
  mode: 'versioned' | 'overwrite' = 'versioned'
): Promise<{ success: boolean; path: string; backupCreated: boolean }> {
  try {
    const response = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: component.filePath,
        content: component.code,
        mode
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Save failed');
    }

    const result = await response.json();
    
    console.log(`[GENERATED] ${result.path}`);
    if (result.backupCreated) {
      console.log('[BACKUP] Created before overwrite');
    }
    if (result.wasVersioned) {
      console.log('[VERSIONED] Created timestamped copy');
    }

    return {
      success: result.success,
      path: result.path,
      backupCreated: result.backupCreated || false
    };
  } catch (error) {
    console.error('[ComponentGenerator] Save error:', error);
    throw error;
  }
}

/**
 * Check if a component file already exists
 */
export async function checkComponentExists(filePath: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/files/check?path=${encodeURIComponent(filePath)}`);
    
    if (!response.ok) {
      throw new Error('File check failed');
    }
    
    const result = await response.json();
    return result.exists;
  } catch (error) {
    console.error('[ComponentGenerator] File check error:', error);
    return false;
  }
}
