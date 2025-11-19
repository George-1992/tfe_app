export const camelToKebab = (input) => {
    try {
        // Handle null or undefined
        if (input == null) return input;

        // Handle strings
        if (typeof input === 'string') {
            return input.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        }

        // Handle arrays
        if (Array.isArray(input)) {
            return input.map(item => camelToKebab(item));
        }

        // Handle objects
        if (typeof input === 'object') {
            const newObj = {};
            for (const key in input) {
                const kebabKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                newObj[kebabKey] = camelToKebab(input[key]);
            }
            return newObj;
        }

        // Return primitives as-is (numbers, booleans, etc.)
        return input;
    } catch (error) {
        console.error('camelToKebab error: ', error);
        return input;
    }
}