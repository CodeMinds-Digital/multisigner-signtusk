'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Member {
  email: string
  role: string
  helpText: string
}

export function InviteMembers() {
  const [members, setMembers] = useState<Member[]>([
    { email: '', role: '', helpText: '' },
    { email: '', role: '', helpText: '' }
  ])

  const roles = ['Admin', 'Editor', 'Viewer']

  const handleInputChange = (index: number, field: keyof Member, value: string) => {
    const newMembers = [...members]
    newMembers[index][field] = value
    setMembers(newMembers)
  }

  const addEmailField = () => {
    setMembers([...members, { email: '', role: '', helpText: '' }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitted members:', members)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Invite Members to your channel</CardTitle>
            <CardDescription>
              Let's get you started. Create your account below to secure and sign your documents with ease.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <form onSubmit={handleSubmit}>
                  {members.map((member, index) => (
                    <div key={index} className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Email Address
                          </label>
                          <Input
                            type="email"
                            value={member.email}
                            onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                            placeholder="Type your email address"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Role
                          </label>
                          <select
                            value={member.role}
                            onChange={(e) => handleInputChange(index, 'role', e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select role</option>
                            {roles.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm text-gray-600 mb-1">
                          Help Text (Optional)
                        </label>
                        <Input
                          value={member.helpText}
                          onChange={(e) => handleInputChange(index, 'helpText', e.target.value)}
                          placeholder="Add a note for this member"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="mb-6">
                    <Button
                      type="button"
                      onClick={addEmailField}
                      variant="outline"
                      className="w-full"
                    >
                      Add Email Address
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                  >
                    Finish Setup
                  </Button>
                </form>
              </div>

              <div className="hidden lg:block flex-1">
                <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                  <span className="text-gray-500">Team collaboration illustration</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
