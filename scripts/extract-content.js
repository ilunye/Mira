import { isProbablyReaderable, Readability } from '@mozilla/readability';
import { GoogleGenAI } from "@google/genai";

let API_KEY = "";
let controller = null;

// Extract main article content and images using Readability
async function extractArticleContentAndImages(document) {
  const documentClone = document.cloneNode(true);
  const elementsToRemove = documentClone.querySelectorAll('style, script, head, meta, link, noscript');

  elementsToRemove.forEach(element => {
    element.remove();
  });

  console.log('[Mira] Checking if page is readable...');
  
  // Check if page can be parsed by Readability
  const isParseable = isProbablyReaderable(document, { minContentLength: 100 });
  
  let images = [];
  if (documentClone.body.innerHTML.length < 200000) {
    console.log('[Mira] Using Gemini to extract images...');
    const ai = new GoogleGenAI({
      apiKey: API_KEY
    });

    const start_sentence = "Give the src of the img tag of the image in the main body text, regard small icons. Express in json array.\n\n";
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: start_sentence + documentClone.body.innerHTML,
      config: {
        temperature: 0.0,
        top_p: 0.0,
        top_k: 1.0,
        max_output_tokens: 128
      }
    }, {
      signal: controller.signal
    });
    if (controller.signal.aborted) {
      return null;
    }
    images = JSON.parse(
      result.text
        .replace('```json', '')
        .replace('```', '')
        .replace(/\n/g, '')
        .replace(/ /g, '')
    );
  }

  if (!isParseable) {
    console.log('[Mira] Page is not readable, falling back to body.innerText');
    return {
      textContent: document.body.innerText,
      images: images,
      title: document.title
    };
  }
  
  const reader = new Readability(documentClone);
  const article = reader.parse();
  
  if (!article) {
    console.log('[Mira] Readability parsing failed, falling back to body.innerText');
    return {
      textContent: document.body.innerText,
      images: images,
      title: document.title
    };
  }
  
  console.log('[Mira] ✅ Successfully parsed article with Readability');
  console.log(`[Mira] Article title: ${article.title}`);
  console.log(`[Mira] Article length: ${article.textContent.length} characters`);
  
  // Create temporary element to extract images from article HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = article.content;
  
  // Extract images from article content if not extracted by Gemini
  if (images.length == 0) {
    console.log('[Mira] No images extracted by Gemini, extracting from article content...');
    const allImages = tempDiv.querySelectorAll('img');
  
    allImages.forEach((img, index) => {
      // Get original image from document by src to get dimensions
      const originalImg = document.querySelector(`img[src="${img.src}"]`);
      const width = originalImg ? (originalImg.naturalWidth || originalImg.width) : 0;
      const height = originalImg ? (originalImg.naturalHeight || originalImg.height) : 0;

      // Filter out small images (likely icons, ads)
      if (width < 200 || height < 200) {
        return;
      }

      images.push(img.src);
    });
  }
  
  console.log(`[Mira] Found ${images.length} valid images in article content`);

  const max_img_nums = 3;
  // Filter to max_img_nums largest images (by pixel area)
  if (images.length > max_img_nums) {
    // To get dimensions, query the <img> element in the original document for each src
    const imagesWithSizes = images.map(src => {
      const imgEl = document.querySelector(`img[src="${src}"]`);
      const width = imgEl ? (imgEl.naturalWidth || imgEl.width || 0) : 0;
      const height = imgEl ? (imgEl.naturalHeight || imgEl.height || 0) : 0;
      return {
        src,
        size: width * height
      };
    });

    // Sort descending by area and take the top max_img_nums
    imagesWithSizes.sort((a, b) => b.size - a.size);

    // Keep only their srcs
    images = imagesWithSizes.slice(0, max_img_nums).map(i => i.src);
  }
  
  return {
    textContent: article.textContent,
    images: images,
    title: article.title,
    excerpt: article.excerpt
  };
}

// Generate AI description for image (exactly like alt-texter)
async function generateImageDescription(imgSrc) {
  console.log('[Mira] Generating image description for:', imgSrc);
  try {
    // Create language model with image input support (exactly like alt-texter)
    const session = await self.LanguageModel.create({
      temperature: 0.0,
      topK: 1.0,
      expectedInputs: [{ type: 'image' }],
      outputLanguage: "en",
      signal: controller.signal
    });
    
    // Create an image bitmap to pass it to the prompt (exactly like alt-texter)
    const response = await fetch(imgSrc);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    // Build multimodal prompt (exactly like alt-texter)
    const prompt = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            value: `Please provide a functional, objective description no longer than 100 words of the provided image so that someone who could not see it would be able to imagine it. Output necessary text and numbers if any. Output a general conclusion if the figure is a chart or a graph, pointing out the highest or lowest value of each category (read the column name or the row name) and the trend.`
          },
          { type: 'image', value: imageBitmap }
        ]
      }
    ];
    
    const result = await session.prompt(prompt, {
      signal: controller.signal
    });
    if (controller.signal.aborted) {
      console.log("gemini create img caption aborted, " + result);
      return null;
    }
    console.log('[Mira] Image description:', result);
    return result || 'Failed to generate image description';
  } catch (error) {
    console.warn('[Mira] Failed to generate image description:', error.message);
    return null; // Skip this image (CORS or other errors)
  }
}

// Build complete content with text and image descriptions
async function buildContentWithImages(baseText, images) {
  // If no images, return text directly
  if (images.length === 0) {
    return baseText;
  }
  
  // Generate description for each image (parallel processing for speed)
  console.log('[Mira] Starting image description generation...');
  const imageDescriptions = await Promise.all(
    images.map(async (img, idx) => {
      console.log(`[Mira] Processing image ${idx + 1}/${images.length}...`);
      const description = await generateImageDescription(img);
      return description;
    })
  );
  
  console.log('[Mira] All image descriptions generated');
  
  // Filter out null descriptions (CORS issues) and append to base text
  const validDescriptions = imageDescriptions.filter(desc => desc !== null);
  
  if (validDescriptions.length === 0) {
    console.log('[Mira] No valid image descriptions generated');
    return baseText;
  }
  
  let fullContent = baseText + '\n\n--- Images ---\n\n';
  validDescriptions.forEach((description, idx) => {
    fullContent += `[Image ${idx + 1}]: ${description}\n\n`;
  });
  
  console.log(`[Mira] Added ${validDescriptions.length} image descriptions`);
  
  return fullContent;
}

// Main parse function
async function parse(document) {
  controller = new AbortController();
  console.log('[Mira] Starting page parsing with Readability...');
  
  try {
    // 1. Extract article content and images using Readability
    const article = await extractArticleContentAndImages(document);
    if (article == null) {
      return null;
    }
    
    // 2. Build metadata header
    let fullContent = '';
    if (article.title) {
      fullContent += `Title: ${article.title}\n`;
    }
    if (article.title) {
      fullContent += '\n---\n\n';
    }
    
    // 3. Add main text content
    fullContent += article.textContent;
    
    // 4. Add image descriptions if any
    if (article.images.length > 0) {
      console.log(`[Mira] Processing ${article.images.length} images from article...`);
      const contentWithImages = await buildContentWithImages(fullContent, article.images);
      fullContent = contentWithImages;
    }
    
    console.log('[Mira] Parsing complete!');
    console.log(`[Mira] Final content length: ${fullContent.length} characters`);
    
    return fullContent;
  } catch (error) {
    console.error('[Mira] Parsing failed:', error);
    // Fallback: return text only
    return document.body.innerText;
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    if (request.apiKey) {
      API_KEY = request.apiKey;
    }
    // Execute parse and return result (async execution)
    (async () => {
      try {
        const content = await parse(window.document);
        sendResponse({ content: content });
      } catch (error) {
        console.error('[Mira] Error parsing content:', error);
        sendResponse({ content: null, error: error.message });
      }
    })();
    
    // Return true to indicate we will send a response asynchronously
    return true;
  } else if (request.action === 'stop') {
    (async () => {
      if (controller) {
        controller.abort();
      }
    })();

    return true;
  }
});
