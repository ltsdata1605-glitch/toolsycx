import html2canvas from 'html2canvas';

const waitForImages = (element: HTMLElement): Promise<void[]> => {
    const images = Array.from(element.querySelectorAll('img'));
    const promises = images.map(img => {
        if (img.complete && img.naturalHeight !== 0) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            // Also resolve on error to avoid blocking the export process indefinitely.
            img.onerror = () => resolve();
        });
    });
    return Promise.all(promises);
};


export async function exportElementAsImage(element: HTMLElement, filename: string, options: any = {}) {
    const { elementsToHide = [], forceOpenDetails = false, scale = 2, isCompactTable = false, captureAsDisplayed = false, forcedWidth = null } = options;

    elementsToHide.forEach((s: string) => document.querySelectorAll(s).forEach((e: any) => e.style.visibility = 'hidden'));
    document.body.classList.add('is-capturing');

    const clone = element.cloneNode(true) as HTMLElement;

    // --- FIX FOR MODERN COLORS (CRITICAL FOR TAILWIND V4) ---
    // html2canvas does not support oklch() or oklab() color functions.
    // We resolve them to rgb/hex by reading computed styles from the ORIGINAL elements
    // and applying the resolved values to the CLONE.
    const colorResolverCanvas = document.createElement('canvas');
    const colorResolverCtx = colorResolverCanvas.getContext('2d');
    
    const resolveModernColor = (color: string): string => {
        if (!color || (!color.includes('oklch') && !color.includes('oklab')) || !colorResolverCtx) return color;
        try {
            // Canvas fillStyle resolution is a reliable way to convert any CSS color string to rgb/hex
            colorResolverCtx.fillStyle = color;
            return colorResolverCtx.fillStyle; 
        } catch (e) {
            return 'rgb(128, 128, 128)'; // Fallback
        }
    };

    const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'fill', 'stroke'];
    
    const originalElements = [element, ...Array.from(element.querySelectorAll('*'))];
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll('*'))];

    originalElements.forEach((origEl, idx) => {
        const cloneEl = cloneElements[idx];
        if (origEl instanceof Element && cloneEl instanceof HTMLElement) {
            const computedStyle = window.getComputedStyle(origEl);
            
            colorProps.forEach(prop => {
                const computedVal = (computedStyle as any)[prop];
                if (computedVal && (computedVal.includes('oklch') || computedVal.includes('oklab'))) {
                    const resolved = resolveModernColor(computedVal);
                    cloneEl.style.setProperty(prop, resolved, 'important');
                }
            });

            // Special handling for gradients in background-image
            const bgImg = computedStyle.backgroundImage;
            if (bgImg && (bgImg.includes('oklch') || bgImg.includes('oklab'))) {
                // This is complex because gradients have multiple colors. 
                // A simple regex replacement for oklch/oklab patterns might work.
                const resolvedBgImg = bgImg.replace(/(oklch|oklab)\([^)]+\)/g, (match) => resolveModernColor(match));
                cloneEl.style.setProperty('background-image', resolvedBgImg, 'important');
            }
        }
    });

    // ROBUST OVERFLOW FIX: Recursively find and disable any properties that might clip
    // the content during capture (e.g., overflow, max-height). This is crucial for components
    // that use `overflow-hidden` for layout purposes, like achieving rounded corners on tables,
    // which was causing the right border to be cut off during export.
    const elementsWithPotentialOverflow = [clone, ...Array.from(clone.querySelectorAll('*'))];
    elementsWithPotentialOverflow.forEach(el => {
        if (el instanceof HTMLElement) {
            const computedStyle = window.getComputedStyle(el);
            const hasOverflowClass = Array.from(el.classList).some(cls => cls.startsWith('overflow-'));
            const hasMaxHeightClass = Array.from(el.classList).some(cls => cls.startsWith('max-h-'));
            
            // Check computed style as well for inline styles or other CSS rules
            // NOTE: We override with 'visible !important' to ensure content is not clipped.
            if (hasOverflowClass || computedStyle.overflow !== 'visible' || computedStyle.overflowX !== 'visible' || computedStyle.overflowY !== 'visible') {
                el.style.setProperty('overflow', 'visible', 'important');
                el.style.setProperty('overflow-x', 'visible', 'important');
                el.style.setProperty('overflow-y', 'visible', 'important');
            }
             if (hasMaxHeightClass || computedStyle.maxHeight !== 'none') {
                el.style.setProperty('max-height', 'none', 'important');
            }
        }
    });

    // --- FIX FOR STICKY COLUMNS/HEADERS (CRITICAL FOR TABLES) ---
    // Sticky elements (like Employee Name column) often render incorrectly (blacked out or shifted behind)
    // in html2canvas. We must convert them to static/relative positioning in the clone.
    const stickyElements = clone.querySelectorAll('.sticky, [class*="sticky"], th, td');
    stickyElements.forEach(el => {
        if (el instanceof HTMLElement) {
            const style = window.getComputedStyle(el);
            // Check inline style or computed style or class
            const isSticky = style.position === 'sticky' || el.classList.contains('sticky') || el.style.position === 'sticky';
            
            if (isSticky) {
                el.style.setProperty('position', 'relative', 'important');
                el.style.setProperty('left', 'auto', 'important');
                el.style.setProperty('top', 'auto', 'important');
                // Force high z-index to prevent being covered
                el.style.setProperty('z-index', '100', 'important'); 
                // Ensure opaque background if it was relying on inherit
                if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
                     // Try to guess a background based on parent or default to white/dark
                     const isDark = document.documentElement.classList.contains('dark');
                     el.style.setProperty('background-color', isDark ? '#1e293b' : '#ffffff', 'important');
                }
            }
        }
    });

    // Special styling for exports to fix layout shifts and add requested padding.

    // 1. KPI Cards: Add padding AND FORCE GRID LAYOUT (2 Columns)
    const kpiGrid = clone.querySelector('.kpi-grid-for-export');
    if (kpiGrid && kpiGrid instanceof HTMLElement) {
        // Force 2-column grid layout for export
        kpiGrid.style.setProperty('display', 'grid', 'important');
        kpiGrid.style.setProperty('grid-template-columns', 'repeat(2, minmax(0, 1fr))', 'important');
        kpiGrid.style.setProperty('gap', '1rem', 'important');
        kpiGrid.style.setProperty('width', '100%', 'important');
        // Removed fixed min-width to allow adaptation to capture container width,
        // but usually 2 columns are fine in normal capture widths.
    }

    const kpiCardElements = clone.querySelectorAll('.kpi-grid-for-export > .chart-card');
    kpiCardElements.forEach(el => {
        if (el instanceof HTMLElement) {
            // The card has p-4 (1rem) by default. We add 5px to the bottom.
            el.style.paddingBottom = 'calc(1rem + 5px)';
        }
    });

    // b) Add specific padding below the auxiliary info in the "Tra Gop" card.
    const traGopAuxElements = clone.querySelectorAll('.chart-card .flex-shrink-0 > .text-xs');
    traGopAuxElements.forEach(el => {
        if (el instanceof HTMLElement) {
            el.style.paddingBottom = '5px';
        }
    });


    // 2. Industry Grid Cards: Add 5px padding below the industry name.
    // This applies when exporting the industry grid or the business overview.
    if (filename.startsWith('ty-trong-nganh-hang') || filename.startsWith('tong-quan-kinh-doanh')) {
        const industryCardTitles = clone.querySelectorAll('.industry-cards-grid .font-bold.truncate.w-full');
        industryCardTitles.forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.paddingBottom = '5px';
            }
        });
    }

    // 3. Top Seller List Items: Add 5px padding to various elements to fix alignment issues on export.
    // This applies when exporting the top seller list or the business overview.
    if (filename.startsWith('top-ban-chay') || filename.startsWith('tong-quan-kinh-doanh') || filename.startsWith('phan-tich-nhan-vien-topSellers')) {
        const topSellerElementsToPad = [
            ...clone.querySelectorAll('.flex-grow.min-w-0 > .font-bold.truncate'), // Name
            ...clone.querySelectorAll('.flex-grow.min-w-0 > .text-xs'),           // Metrics container
            ...clone.querySelectorAll('.w-8.text-2xl'),                           // Medal rank
            ...clone.querySelectorAll('.w-8.text-xs.font-bold'),                  // Bot rank
            ...clone.querySelectorAll('.text-right.flex-shrink-0')                // DTQD container
        ];
        
        topSellerElementsToPad.forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.paddingBottom = '5px';
            }
        });
    }

    // 4. Warehouse Summary & Summary Table Fix: Add padding and z-index fix for export.
    // This fixes the white streak issue on rowSpan cells (e.g., KHO, NGÀNH HÀNG).
    if (filename.startsWith('bao-cao-kho') || filename.startsWith('chi-tiet-nganh-hang')) {
        const elementsToPad = [
            // Removed header padding addition to make it compact
            ...clone.querySelectorAll('tbody > tr'), // Table rows
            ...clone.querySelectorAll('tfoot') // Table footer
        ];

        elementsToPad.forEach(el => {
            if (el instanceof HTMLElement) {
                el.style.paddingBottom = '5px';
            }
        });

        // FIX (REINFORCED): The html2canvas library incorrectly renders the background of sticky headers.
        // We target the first TH of the first TR in THEAD (which corresponds to "KHO" or "NGÀNH HÀNG").
        // This applies to both Standard view (single row) and Comparison view (rowSpan=2).
        const mainHeaderCell = clone.querySelector('thead tr:first-child th:first-child');
        
        if (mainHeaderCell && mainHeaderCell instanceof HTMLElement) {
            // Reset sticky position to relative to prevent layering issues during capture
            mainHeaderCell.style.setProperty('position', 'relative', 'important');
            mainHeaderCell.style.setProperty('z-index', '9999', 'important');

            const isDark = document.documentElement.classList.contains('dark');
            let bgColor = isDark ? '#1f2937' : '#f8fafc'; // Default: slate-800 or slate-50
            
            // For Summary Table (chi-tiet-nganh-hang), force the specific header background
            if (filename.startsWith('chi-tiet-nganh-hang')) {
                bgColor = isDark ? '#1f2937' : '#eef2ff'; // bg-indigo-50 or slate-800
            } else if (filename.startsWith('bao-cao-kho')) {
                // UPDATE: Match the new pastel "KHO" header color (bg-rose-200)
                bgColor = isDark ? '#881337' : '#fecdd3'; // rose-900 : rose-200
            }
            
            mainHeaderCell.style.setProperty('background-color', bgColor, 'important');
            // Ensure no other background layers interfere
            mainHeaderCell.style.setProperty('background-image', 'none', 'important');
        }

        // Target secondary header rows to push them down in stacking context
        const headerRows = clone.querySelectorAll('thead tr');
        if (headerRows.length > 1) {
            const secondHeaderRow = headerRows[1] as HTMLElement;
            secondHeaderRow.style.setProperty('position', 'relative', 'important');
            secondHeaderRow.style.setProperty('z-index', '0', 'important');
        }
    }

    // 5. Compact Warehouse Summary for Export
    if (filename.startsWith('bao-cao-kho')) {
        const headerContainer = clone.querySelector('.px-8.py-6');
        if (headerContainer instanceof HTMLElement) {
            // Compact Header
            headerContainer.style.setProperty('padding-top', '15px', 'important');
            headerContainer.style.setProperty('padding-bottom', '10px', 'important');
        }
        
        const tableContainer = clone.querySelector('.overflow-x-auto.p-4');
        if (tableContainer instanceof HTMLElement) {
            // Compact Table Area
            tableContainer.style.setProperty('padding-top', '0', 'important');
            tableContainer.style.setProperty('padding-bottom', '10px', 'important');
        }
    }


    if (forceOpenDetails) {
        const detailsToOpen = [
            ...(clone.tagName.toLowerCase() === 'details' ? [clone as HTMLDetailsElement] : []),
            ...Array.from(clone.querySelectorAll('details'))
        ];
        detailsToOpen.forEach(detail => {
            detail.open = true;
        });
    }
    
     // FIX FOR SCROLLABLE CONTENT (e.g., Performance Modal)
    const scrollableContainers = clone.querySelectorAll('.max-h-96.overflow-y-auto, .max-h-60.overflow-y-auto, [class*="max-h-"][class*="overflow-y-"]');
    scrollableContainers.forEach((container: any) => {
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
    });


    // This container is needed to compute styles and dimensions correctly.
    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    captureContainer.style.left = '-9999px';
    captureContainer.style.top = '0';
    
    if (forcedWidth) {
        captureContainer.style.width = `${forcedWidth}px`;
        captureContainer.style.height = 'auto';
    } else if (captureAsDisplayed) {
        // To capture only the visible area, we must constrain the container
        // to the original element's client dimensions and hide overflow.
        captureContainer.style.width = `${element.clientWidth}px`;
        captureContainer.style.height = `${element.clientHeight}px`;
        captureContainer.style.overflow = 'hidden';
    } else {
        // Use 'fit-content' to make the container intrinsically size itself to its content.
        captureContainer.style.width = 'fit-content';
        captureContainer.style.height = 'auto';
    }
    
    const shouldCompactTable = captureAsDisplayed ? false : isCompactTable;
    if (shouldCompactTable) {
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.classList.add('compact-export-table');
        });
    }

    captureContainer.appendChild(clone);
    document.body.appendChild(captureContainer);
    
    // ROBUST FIX: Address icon rendering issues on KPI Cards during export.
    // This addresses issues with how html2canvas handles SVG colors and stacking contexts.
    if (clone.querySelector('.kpi-grid-for-export')) {
        const kpiCards = clone.querySelectorAll('.kpi-grid-for-export .chart-card');
        
        kpiCards.forEach(card => {
            if (card instanceof HTMLElement) {
                // Fix 1: The decorative background icon was rendering on top of text.
                // This is often caused by `overflow: hidden` on the parent creating an
                // unexpected stacking context that `html2canvas` misinterprets.
                // By setting overflow to visible on the clone, we allow the existing z-index
                // (z-0 for icon, z-10 for text) to function correctly during capture.
                card.style.overflow = 'visible';
                
                // Fix 2: Ensure the small icon in the header renders correctly.
                // html2canvas fails to compute `currentColor`. We must apply the color directly.
                const functionalIconContainer = card.querySelector<HTMLElement>('.flex-shrink-0');
                if (functionalIconContainer) {
                    const iconSVG = functionalIconContainer.querySelector<SVGElement>('svg');
                    const computedColor = window.getComputedStyle(functionalIconContainer).color;
                    
                    if (iconSVG && computedColor) {
                       // Apply color to the SVG element itself to help with inheritance.
                       iconSVG.setAttribute('stroke', computedColor);
                       
                       // Also apply to all child elements for maximum compatibility.
                       iconSVG.querySelectorAll('line, path, rect, circle, polyline, polygon').forEach((child) => {
                           if (child instanceof SVGElement) {
                               child.setAttribute('stroke', computedColor);
                           }
                       });
                    }
                }
            }
        });
    }
    
    try {
        // --- REVISED WAITING LOGIC ---
        // 1. Wait for fonts to be ready. This is the main solution for text rendering issues.
        await document.fonts.ready;
        
        // 2. Wait for any images inside the clone to finish loading.
        await waitForImages(clone);

        // 3. Wait for the browser's next paint cycle to ensure styles and fonts are applied.
        // Waiting for two frames is a robust way to handle complex rendering updates.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // 4. A final small delay as a fallback for asynchronous scripts like Tailwind's JIT.
        await new Promise(resolve => setTimeout(resolve, 500));
        // --- END OF REVISED LOGIC ---

        console.log(`Bắt đầu chụp ảnh: ${filename}...`);

        const finalWidth = captureAsDisplayed ? element.clientWidth : clone.scrollWidth;
        const finalHeight = captureAsDisplayed ? element.clientHeight : clone.scrollHeight;
        
        // Safety check for canvas size limits (approx 16k for most browsers)
        let finalScale = scale;
        if (finalHeight * scale > 15000) {
            finalScale = Math.max(1, 15000 / finalHeight);
            console.warn(`Cảnh báo: Ảnh quá dài (${finalHeight}px). Tự động giảm tỉ lệ xuống ${finalScale.toFixed(2)} để tránh lỗi trình duyệt.`);
        }

        const canvas = await html2canvas(clone, {
            scale: finalScale,
            useCORS: true,
            allowTaint: false,
            backgroundColor: (filename.startsWith('bao-cao-kho') || filename.startsWith('chi-tiet-nganh-hang'))
                ? null 
                : (document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc'),
            logging: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: document.documentElement.clientWidth,
            windowHeight: document.documentElement.clientHeight,
            width: finalWidth,
            height: finalHeight,
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error("Không thể tạo canvas (canvas trống hoặc kích thước bằng 0).");
        }

        console.log(`Đã tạo canvas (${canvas.width}x${canvas.height}). Đang tải xuống...`);

        // Use Blob for more reliable downloads across different browsers/environments
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error("Không thể tạo Blob từ canvas.");
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log(`Đã hoàn tất xuất ảnh: ${filename}`);
        }, 'image/png', 1.0);

    } catch (error) {
        console.error(`Lỗi khi xuất ảnh: ${filename}`, error);
        // Fallback for environments where Blob might fail (though rare)
        try {
            const dataUrl = clone.querySelector('canvas') ? null : null; // Placeholder for logic
            // If the above failed, we can try a direct dataURL as last resort
        } catch (e) {}
    } finally {
        document.body.removeChild(captureContainer);
        document.body.classList.remove('is-capturing');
        elementsToHide.forEach((s: string) => document.querySelectorAll(s).forEach((e: any) => e.style.visibility = ''));
    }
}
