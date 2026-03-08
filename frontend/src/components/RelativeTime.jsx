import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

const RelativeTime = ({ timestamp }) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        const updateTime = () => {
            if (timestamp) {
                try {
                    setTimeAgo(formatDistanceToNow(new Date(timestamp), { addSuffix: true }));
                } catch (e) {
                    setTimeAgo('just now');
                }
            }
        };

        updateTime();
        // Update every 30 seconds to keep it fresh
        const intervalId = setInterval(updateTime, 30000);

        return () => clearInterval(intervalId);
    }, [timestamp]);

    return <>{timeAgo}</>;
};

export default RelativeTime;
