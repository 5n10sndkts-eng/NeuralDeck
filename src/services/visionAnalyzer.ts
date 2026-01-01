/**
 * Vision AI Analyzer
 * 
 * Analyzes UI mockups using Vision AI (GPT-4V or local alternative)
 * and extracts structured component information.
 */

export interface VisionAnalysisResult {
  layout: 'flex-row' | 'flex-col' | 'grid' | 'absolute';
  components: ComponentDescription[];
  colorPalette: string[];
  typography: TypographyInfo;
  spacing: SpacingInfo;
  rawAnalysis: string;
}

export interface ComponentDescription {
  type: 'button' | 'input' | 'text' | 'image' | 'card' | 'container' | 'icon' | 'link';
  position: { x: number; y: number; width: number; height: number };
  content?: string;
  styles: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
  };
  props?: Record<string, string>;
}

export interface TypographyInfo {
  primaryFont: string;
  headingSizes: string[];
  bodySize: string;
}

export interface SpacingInfo {
  gridSize: number; // Base unit (e.g., 8px)
  containerPadding: string;
  componentGap: string;
}

/**
 * Analyze image using Backend Proxy (R-003 Security Mitigation)
 * API key is stored server-side only, never exposed to client
 */
export async function analyzeWithGPT4V(
  imageDataUrl: string
): Promise<VisionAnalysisResult> {
  // Extract base64 data from data URL
  const base64Data = imageDataUrl.split(',')[1];
  
  if (!base64Data) {
    throw new Error('Invalid image data URL');
  }

  try {
    // Call BACKEND PROXY instead of OpenAI directly
    // API key is stored in server environment, never in client code
    const response = await fetch('/api/vision/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If backend suggests fallback (API key not configured), use local mode
      if (errorData.fallback) {
        console.warn('Vision API not configured on backend, using local fallback');
        throw new Error('FALLBACK_REQUIRED');
      }
      
      throw new Error(`Backend proxy error: ${response.statusText}`);
    }

    const result = await response.json();

    // Transform backend response to expected format
    const analysisResult: VisionAnalysisResult = {
      layout: result.layout || 'flex-col',
      components: result.components || [],
      colorPalette: result.colors || [],
      typography: result.typography || {
        primaryFont: 'Inter',
        headingSizes: ['32px'],
        bodySize: '16px',
      },
      spacing: result.spacing || {
        gridSize: 8,
        containerPadding: '24px',
        componentGap: '16px',
      },
      rawAnalysis: result.rawText || JSON.stringify(result),
    };

    return analysisResult;
  } catch (error) {
    console.error('Vision analysis failed:', error);
    
    // If backend explicitly requests fallback, use local mode
    if ((error as Error).message === 'FALLBACK_REQUIRED') {
      throw error; // Let main function catch and use fallback
    }
    
    throw error;
  }
}

/**
 * Analyze image using local fallback (basic layout detection)
 */
export async function analyzeWithLocalFallback(
  imageDataUrl: string
): Promise<VisionAnalysisResult> {
  // Placeholder for local vision model integration
  // This could use TensorFlow.js, ONNX, or similar
  
  console.warn('Using fallback analysis - accuracy limited');

  return {
    layout: 'flex-col',
    components: [
      {
        type: 'container',
        position: { x: 0, y: 0, width: 100, height: 100 },
        content: 'Detected container',
        styles: {
          backgroundColor: '#FFFFFF',
          padding: '24px',
        },
      },
    ],
    colorPalette: ['#FFFFFF', '#000000'],
    typography: {
      primaryFont: 'Inter',
      headingSizes: ['32px'],
      bodySize: '16px',
    },
    spacing: {
      gridSize: 8,
      containerPadding: '24px',
      componentGap: '16px',
    },
    rawAnalysis: 'Fallback analysis (limited accuracy)',
  };
}

/**
 * Main entry point - tries Backend Proxy (GPT-4V), falls back to local if unavailable
 * 
 * SECURITY: API key is NEVER exposed to client - all calls go through /api/vision/analyze
 */
export async function analyzeUIImage(
  imageDataUrl: string,
  preferLocal: boolean = false
): Promise<VisionAnalysisResult> {
  // If user explicitly requests local mode, skip backend
  if (preferLocal) {
    return analyzeWithLocalFallback(imageDataUrl);
  }

  try {
    // Always try backend proxy first (secure)
    return await analyzeWithGPT4V(imageDataUrl);
  } catch (error) {
    console.error('Backend vision analysis failed, using local fallback:', error);
    // If backend proxy fails or unavailable, use local fallback
    return analyzeWithLocalFallback(imageDataUrl);
  }
}

/**
 * Convert File to base64 data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
