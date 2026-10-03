import { 
  InvoiceCustomization, 
  DateFormatType, 
  NumberFormatType, 
  FontFamilyType, 
  FontSizeScale, 
  TableDensity 
} from '../types/invoice';

/**
 * Format currency with user customized symbol and number format (Indian or International)
 */
export function formatCustomCurrency(
  amount: number | undefined | null,
  customization?: Partial<InvoiceCustomization>
): string {
  const val = Number(amount) || 0;
  const symbol = customization?.currencySymbol ?? '₹';
  const formatType: NumberFormatType = customization?.numberFormat ?? 'indian';

  let formattedNumber = '';
  if (formatType === 'international') {
    formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  } else {
    formattedNumber = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  }

  return `${symbol}${formattedNumber}`;
}

/**
 * Format dates according to user preference
 */
export function formatCustomDate(
  dateString?: string,
  dateFormat: DateFormatType = 'DD/MM/YYYY'
): string {
  if (!dateString) return '';
  
  // If already standard ISO YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    if (dateFormat === 'YYYY-MM-DD') return dateString;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;

    if (dateFormat === 'DD-MMM-YYYY') {
      const mName = monthNames[monthIndex] || month;
      return `${day}-${mName}-${year}`;
    }

    // Default DD/MM/YYYY
    return `${day}/${month}/${year}`;
  }

  return dateString;
}

/**
 * Get CSS font-family class
 */
export function getFontFamilyClass(font: FontFamilyType = 'inter'): string {
  switch (font) {
    case 'roboto-mono':
      return 'font-mono';
    case 'georgia':
      return 'font-serif';
    case 'system':
      return 'font-sans';
    case 'inter':
    default:
      return 'font-sans';
  }
}

/**
 * Get font size scale classes for invoice container
 */
export function getFontSizeScaleClasses(scale: FontSizeScale = 'normal'): string {
  switch (scale) {
    case 'compact':
      return 'text-[11px] leading-snug';
    case 'large':
      return 'text-[13px] leading-relaxed';
    case 'normal':
    default:
      return 'text-xs leading-normal';
  }
}

/**
 * Get table padding density
 */
export function getTableDensityClasses(density: TableDensity = 'comfortable'): string {
  switch (density) {
    case 'tight':
      return 'p-1.5 text-[10px]';
    case 'spacious':
      return 'p-3 text-xs';
    case 'comfortable':
    default:
      return 'p-2 text-[11px]';
  }
}
