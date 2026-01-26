
import { notFound } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { demoBlogs, BlogPost } from '@/lib/data';
import BlogContent from '../BlogContent';

// Generate static params for all known blogs at build time
export async function generateStaticParams() {
    // 1. Get demo blog IDs
    const demoIds = demoBlogs.map(blog => ({ id: blog.id }));

    // 2. Get Firestore blog IDs (only approved ones)
    // Note: In a real build environment, we need to ensure Firebase is accessible
    // For "export" output, this runs at build time.
    let firestoreIds: { id: string }[] = [];
    try {
        const q = query(collection(db, 'blogs'), where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        firestoreIds = querySnapshot.docs.map(doc => ({ id: doc.id }));
    } catch (error) {
        console.error('Error fetching blog IDs for static params:', error);
        // Fallback to just demo IDs if Firestore fails (e.g. no creds during build)
    }

    // Combine and deduplicate
    const allIds = [...demoIds, ...firestoreIds];
    // dedupe by id just in case
    const uniqueIds = Array.from(new Set(allIds.map(item => item.id))).map(id => ({ id }));

    return uniqueIds;
}

async function getBlogData(id: string): Promise<BlogPost | null> {
    // 1. Check demo blogs first
    const demoBlog = demoBlogs.find(b => b.id === id);
    if (demoBlog) {
        return demoBlog;
    }

    // 2. Check Firestore
    try {
        const docRef = doc(db, 'blogs', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
                publishedAt: docSnap.data().createdAt?.toDate() || new Date(),
            } as BlogPost;
        }
    } catch (error) {
        console.error(`Error fetching blog ${id}:`, error);
    }

    return null;
}

interface PageProps {
    params: {
        id: string;
    }
}

export default async function BlogPage({ params }: PageProps) {
    const { id } = params;
    const blog = await getBlogData(id);

    if (!blog) {
        notFound();
    }

    return <BlogContent blog={blog} />;
}
