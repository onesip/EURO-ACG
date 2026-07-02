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
  
  const postsSnapshot = await db.collection('posts').get();
  let processed = 0;
  let updated = 0;

  const batch = db.batch();
  let batchCount = 0;

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
            batchCount = 0;
        }
      }
      updated++;
      console.log(`Need update: ${doc.id} (Likes: ${likeCount}, Comments: ${commentCount})`);
    }
  }

  if (isWrite && batchCount > 0) {
    await batch.commit();
  }

  console.log(`Migration finished. Processed: ${processed}, Updated: ${updated}, Write Mode: ${isWrite}`);
}

migrate().catch(console.error);
