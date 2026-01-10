import { notFound } from 'next/navigation'

export const runtime = 'edge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.makethe.app'

interface User {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
}

async function getUser(username: string): Promise<{ user: User; projects: Project[] } | null> {
  try {
    const res = await fetch(`${API_URL}/v1/users/${username}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const data = await getUser(username)
  
  if (!data) {
    notFound()
  }

  const { user, projects } = data

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name || user.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <span className="text-4xl text-primary-600">
                {(user.display_name || user.username)[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.display_name || user.username}
            </h1>
            <p className="text-gray-500">@{user.username}</p>
            <p className="text-sm text-gray-400 mt-1">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Public Projects
        </h2>
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">No public projects yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-gray-600 mb-4">{project.description}</p>
                )}
                <p className="text-sm text-gray-400">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const data = await getUser(username)
  
  if (!data) {
    return {
      title: 'User Not Found - MakeThe.App',
    }
  }

  return {
    title: `${data.user.display_name || data.user.username} - MakeThe.App`,
    description: `View ${data.user.username}'s projects on MakeThe.App`,
  }
}
