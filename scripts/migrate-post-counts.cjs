const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const isWrite = process.argv.includes('--write');

async function migrate() {
  console.log(`Starting migration (write mode: ${isWrite})...`);
  
  let processed = 0;
  let updated = 0;

  let batch = db.batch();
  let batchCount = 0;

  let lastDoc = null;
  let hasMore = true;
  const PAGE_SIZE = 100;

  while (hasMore) {
    let q = db.collection('posts').limit(PAGE_SIZE);
    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }
    const postsSnapshot = await q.get();
    if (postsSnapshot.empty) {
      hasMore = false;
      break;
    }

    lastDoc = postsSnapshot.docs[postsSnapshot.docs.length - 1];

    for (const doc of postsSnapshot.docs) {
      const post = doc.data();
      processed++;

      // Calculate counts
      const likes = post.likes || [];
      const likeCount = likes.length;
      
      // For commentCount, we need to count subcollection
      const commentsSnapshot = await db.collection('posts').doc(doc.id).collection('comments').count().get();
      const commentCount = commentsSnapshot.data().count;

      if (post.likeCount !== likeCount || post.commentCount !== commentCount) {
        if (isWrite) {
          batch.update(doc.ref, {
            likeCount: likeCount,
            commentCount: commentCount,
            countsMigratedAt: new Date()
          });
          batchCount++;
          
          if (batchCount === 500) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
          }
        }
        updated++;
        console.log(`Need update: ${doc.id} (Likes: ${likeCount}, Comments: ${commentCount})`);
      }
    }

    if (postsSnapshot.docs.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  if (isWrite && batchCount > 0) {
    await batch.commit();
  }

  console.log(`Migration finished. Processed: ${processed}, Updated: ${updated}, Write Mode: ${isWrite}`);
}

migrate().catch(console.error);
