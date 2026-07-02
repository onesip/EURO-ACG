import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CommentCountProps {
  parentCollection: string;
  parentId: string;
}

export default function CommentCount({ parentCollection, parentId }: CommentCountProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!parentCollection || !parentId) return;
    
    const cached = localStorage.getItem(`cached_comments_${parentCollection}_${parentId}`);
    if (cached) {
      try {
        const commentsArray = JSON.parse(cached);
        if (Array.isArray(commentsArray)) {
          setCount(commentsArray.length);
        }
      } catch (_) {}
    }
    
    const fetchCount = async () => {
      try {
        const snapshot = await getDocs(collection(db, parentCollection, parentId, 'comments'));
        setCount(snapshot.size);
      } catch (error) {
        console.error("CommentCount fetch error:", error);
      }
    };
    
    fetchCount();
  }, [parentCollection, parentId]);

  return <span>({count})</span>;
}
