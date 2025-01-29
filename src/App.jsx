import React, { useState, useEffect } from 'react';
import { BskyAgent } from '@atproto/api';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const App = () => {
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [viewedStories, setViewedStories] = useState(new Set());
  const [stories, setStories] = useState([]);

  // Initialize Bluesky agent
  useEffect(() => {
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });
    setAgent(agent);
  }, []);

  // Function to group posts by user and filter last 24 hours
  const processTimelinePosts = (posts) => {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const userPosts = {};

    posts.forEach(post => {
      if (new Date(post.post.indexedAt).getTime() > last24Hours) {
        const userId = post.post.author.did;
        if (!userPosts[userId]) {
          userPosts[userId] = {
            id: userId,
            user: {
              name: post.post.author.displayName || post.post.author.handle,
              handle: post.post.author.handle,
              avatar: post.post.author.avatar || '/api/placeholder/100/100'
            },
            posts: []
          };
        }
        userPosts[userId].posts.push({
          id: post.post.cid,
          text: post.post.record.text,
          image: post.post.embed?.images?.[0]?.fullsize || null,
          timestamp: post.post.indexedAt
        });
      }
    });

    return Object.values(userPosts);
  };

  const handleLogin = async (identifier, password) => {
    setIsLoading(true);
    setError(null);
    try {
      await agent.login({ identifier, password });
      const timeline = await agent.getTimeline();
      const processedStories = processTimelinePosts(timeline.data.feed);
      setStories(processedStories);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoryClick = (story) => {
    setSelectedStory(story);
    setCurrentPostIndex(0);
    setViewedStories(prev => new Set([...prev, story.id]));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (!selectedStory) return;
    
    if (currentPostIndex < selectedStory.posts.length - 1) {
      setCurrentPostIndex(prev => prev + 1);
    } else {
      const currentIndex = stories.findIndex(s => s.id === selectedStory.id);
      if (currentIndex < stories.length - 1) {
        setSelectedStory(stories[currentIndex + 1]);
        setCurrentPostIndex(0);
      } else {
        setSelectedStory(null);
        setCurrentPostIndex(0);
      }
    }
  };

  const handlePrevious = (e) => {
    e.stopPropagation();
    if (!selectedStory) return;
    
    if (currentPostIndex > 0) {
      setCurrentPostIndex(prev => prev - 1);
    } else {
      const currentIndex = stories.findIndex(s => s.id === selectedStory.id);
      if (currentIndex > 0) {
        setSelectedStory(stories[currentIndex - 1]);
        setCurrentPostIndex(stories[currentIndex - 1].posts.length - 1);
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Login Form - show if not authenticated */}
      {!agent?.session && (
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Bluesky Stories</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            const identifier = e.target.identifier.value;
            const password = e.target.password.value;
            handleLogin(identifier, password);
          }} className="space-y-4">
            <input
              type="text"
              name="identifier"
              placeholder="handle.bsky.social"
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              name="password"
              placeholder="App Password"
              className="w-full p-2 border rounded"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isLoading ? 'Connecting...' : 'Connect to Bluesky'}
            </button>
          </form>
          {error && (
            <div className="text-red-500 mt-2">{error}</div>
          )}
        </div>
      )}

      {/* Stories Interface - show if authenticated */}
      {agent?.session && (
        <>
          {/* Stories Header */}
          <div className="mb-6 border-b">
            <div className="w-full overflow-x-auto">
              <div className="flex space-x-4 p-4 min-w-min">
                {[...stories].sort((a, b) => {
                  const aViewed = viewedStories.has(a.id);
                  const bViewed = viewedStories.has(b.id);
                  if (aViewed && !bViewed) return 1;
                  if (!aViewed && bViewed) return -1;
                  return 0;
                }).map((story) => (
                  <button
                    key={story.id}
                    onClick={() => handleStoryClick(story)}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-16 h-16 rounded-full overflow-hidden p-0.5 
                      ${viewedStories.has(story.id) 
                        ? 'ring-2 ring-gray-300' 
                        : 'ring-2 ring-blue-500'}`}
                    >
                      <img
                        src={story.user.avatar}
                        alt={story.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span className="text-sm mt-1 text-gray-700 truncate w-16">
                      {story.user.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Story Viewer Modal */}
          {selectedStory && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
              onClick={() => setSelectedStory(null)}
            >
              <div className="relative w-full max-w-2xl mx-auto h-full max-h-screen flex items-center">
                <button 
                  onClick={() => setSelectedStory(null)}
                  className="absolute top-4 right-4 text-white z-10"
                >
                  <X size={24} />
                </button>

                <button
                  onClick={handlePrevious}
                  className="absolute left-4 text-white z-10 p-2"
                  disabled={currentPostIndex === 0 && stories.indexOf(selectedStory) === 0}
                >
                  <ChevronLeft size={24} />
                </button>

                <button
                  onClick={handleNext}
                  className="absolute right-4 text-white z-10 p-2"
                >
                  <ChevronRight size={24} />
                </button>

                <div className="w-full p-4">
                  <div className="bg-white rounded-lg overflow-hidden">
                    <div className="p-4 flex items-center">
                      <img
                        src={selectedStory.user.avatar}
                        alt={selectedStory.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="ml-3">
                        <div className="font-semibold">{selectedStory.user.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(selectedStory.posts[currentPostIndex].timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {selectedStory.posts[currentPostIndex].image && (
                      <div className="w-full aspect-video bg-gray-100">
                        <img
                          src={selectedStory.posts[currentPostIndex].image}
                          alt="Post content"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-gray-800">
                        {selectedStory.posts[currentPostIndex].text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
