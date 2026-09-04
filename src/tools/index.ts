export const getCurrentTimeTool = {
    type: 'function',
    function: {
        name: 'get_current_time',
        description: 'Returns the current local date and time. Useful when needing to know what time it is.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
};

export function getCurrentTime() {
    const now = new Date();
    return {
        time: now.toISOString(),
        localTime: now.toLocaleString(),
    };
}
