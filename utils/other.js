export const isFilePath = (path) => {
    let rs = false;
    try {
        if (!path) {
            return rs;
        }

        if (typeof path !== 'string' || !path.trim()) {
            return rs;
        };

        // Trim trailing slashes
        const cleanPath = path.trim().replace(/[/\\]+$/, '');

        // Check if the path ends with a file extension
        rs = /\.[a-zA-Z0-9]{1,5}$/.test(cleanPath);

        return rs;
    } catch (error) {
        return rs;
    }
};

export const isAuthPath = (path) => {
    try {
        if (!path) {
            console.log('isAuthPath no path');
            return false;
        }

        if (typeof path !== 'string' || !path.trim()) {
            console.log('isAuthPath invalid path');
            return false;
        }

        const cleanPath = path.trim().replace(/[/\\]+$/, '');

        // Define auth paths
        const authPaths = ['/auth/signin', '/auth/signup', '/auth/verify', '/auth/reset'];
        return authPaths.includes(cleanPath);

    } catch (error) {
        console.log('isAuthPath error ==> ', error);
        return false;
    }
}


export const makeFirstLetterUppercase = (str) => {
    try {
        if (!str || typeof str !== 'string') return str;
        let s = str.trim();
        s = s.replace(/\s+/g, ' '); // replace multiple spaces with single space
        s = s.charAt(0).toUpperCase() + s.slice(1);
        s = s.replace(/-/g, ' '); // replace dashes with spaces
        return s;
    } catch (error) {
        console.log('makeFirstLetterUppercase error ==> ', error);
        return str;
    }
}

export const dashToKebab = (str) => {
    try {
        if (!str || typeof str !== 'string') return str;
        return str.replace(/[-\s]+/g, '-').toLowerCase();
    } catch (error) {
        console.log('dashToKebab error ==> ', error);
        return str;
    }
}

export const kebabToCamel = (input) => {
    try {
        if (!input) return input;

        // Handle string input
        if (typeof input === 'string') {
            return input.replace(/-([a-z])/g, (match, char) => char.toUpperCase());
        }

        // Handle object input - recursively convert all keys from kebab to camelCase
        if (typeof input === 'object') {
            if (Array.isArray(input)) {
                return input.map(item => kebabToCamel(item));
            }

            const result = {};
            for (const [key, value] of Object.entries(input)) {
                // Convert the key from kebab to camelCase
                const camelKey = key.replace(/-([a-z])/g, (match, char) => char.toUpperCase());

                // Recursively process nested objects/arrays
                result[camelKey] = typeof value === 'object' && value !== null
                    ? kebabToCamel(value)
                    : value;
            }
            return result;
        }

        // Return as-is for other types
        return input;

    } catch (error) {
        console.log('kebabToCamel error ==> ', error);
        return input;
    }
}

export const camelToSnake = (input) => {
    try {
        // Handle null or undefined
        if (input == null) return input;
        // Handle strings
        if (typeof input === 'string') {
            return input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        }
        // Handle arrays
        if (Array.isArray(input)) {
            return input.map(item => camelToSnake(item));
        }
        // Handle objects - only transform keys, keep values as-is
        if (typeof input === 'object') {
            const newObj = {};
            for (const key in input) {
                const snakeKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                // Don't transform the value, keep it as-is
                newObj[snakeKey] = input[key];
            }
            return newObj;
        }
        // Return primitives as-is (numbers, booleans, etc.)
        return input;
    }
    catch (error) {
        console.error('camelToSnake error: ', error);
        return input;
    }
}

export const camelToDisplay = (str) => {
    // example: 'preQualified' => 'Pre Qualified'
    try {
        if (!str || typeof str !== 'string') return str;
        return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, c => c.toUpperCase());
    } catch (error) {
        console.log('camelToDisplay error ==> ', error);
        return str;
    }
}


export const toDisplayStr = (value) => {
    try {
        if (!value || typeof value !== 'string') return value;

        // Enhanced camel case handling that works with acronyms and numbers
        value = value
            // Insert space before capital letters (camelCase)
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // Insert space after acronyms followed by lowercase
            .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1 $2')
            // Handle numbers
            .replace(/([a-zA-Z])(\d)/g, '$1 $2')
            .replace(/(\d)([a-zA-Z])/g, '$1 $2');

        // Convert kebab-case and snake_case to spaces
        value = value.replace(/[_-]/g, ' ');

        // Clean up multiple spaces and trim
        value = value.replace(/\s+/g, ' ').trim();

        if (!value) return value;

        // Capitalize first letter of each word
        value = value.replace(/\b\w/g, char => char.toUpperCase());

        return value;
    } catch (error) {
        console.log('toDisplayString error ==> ', error);
        return value;
    }
}

export const getFirstLettersFromArray = (arr) => {
    try {
        if (!Array.isArray(arr) || arr.length === 0) return '';
        return arr.map(item => {
            if (typeof item === 'string' && item.trim()) {
                return item.trim().charAt(0).toUpperCase();
            }
            return '';
        }).join('');
    } catch (error) {
        console.log('getFirstLettersFromArray error ==> ', error);
        return '';
    }
}

export const displayDate = (dateStr) => {
    // conver timestamp to Aug 23, 2023
    // conver ISO 8601 string to Aug 23, 2023
    try {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.log('displayDate error ==> ', error);
        return dateStr;
    }
}


export const processEmailBody = ({ body, contact }) => {
    try {
        if (!body || typeof body !== 'string') return body || '';
        if (!contact || typeof contact !== 'object') return body;

        return body.replace(/\{\{contact\.(\w+)\}\}/g, (match, key) => {
            return contact.hasOwnProperty(key) ? String(contact[key] || '') : match;
        });

    } catch (error) {
        console.error('Error processing email body:', error);
        return body;
    }
}

export const toNumLocalString = (num) => {
    try {
        if (num === null || num === undefined || isNaN(num)) return num;
        return new Intl.NumberFormat('en-US', { style: 'decimal' }).format(num);
    } catch (error) {
        console.log('toNumLocalString error ==> ', error);
        return num;
    }
}



export const getIsoString = ({ date, newDate = false }) => {
    try {
        let input = date;
        // Return current time
        if (newDate) {
            return new Date().toISOString();
        }

        // No input
        if (!input && input !== 0) return null;

        let dateValue = input;

        // Extract from common object wrappers
        if (typeof input === 'object' && input !== null && !(input instanceof Date)) {
            dateValue = input.date || input.startDate || input.endDate || input.timestamp || input;
        }

        // Fast path: already a valid ISO string with timezone (ends with Z or +00:00)
        if (
            typeof dateValue === 'string' &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateValue) && // has YYYY-MM-DDTHH:mm:ss
            (dateValue.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateValue))   // has Z or offset
        ) {
            return dateValue; // Already perfect → skip parsing
        }

        // Handle Date objects
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
        }

        // Fallback: parse anything else
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
            console.warn('getIsoString: Invalid date →', input);
            return null;
        }

        return parsed.toISOString();

    } catch (error) {
        console.warn('getIsoString error →', error, 'Input:', input);
        return null;
    }
};