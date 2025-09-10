"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { User, Mail, Calendar, Settings, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { NotionSidebar } from "@/components/ui/notion-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AuthWrapper } from "@/components/AuthWrapper";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        bio: "Passionate about creating beautiful and functional user experiences. Love working with cross-functional teams to bring ideas to life.",
        location: "San Francisco, CA",
        website: "https://example.com"
    });

    const handleSave = () => {
        // TODO: Implement profile update logic with Clerk
        setIsEditing(false);
        console.log("Saving profile:", formData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isLoaded) {
        return null;
    }

    return (
        <AuthWrapper>
            <div className="flex h-screen bg-background">
                <NotionSidebar />
                
                <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold">Profile</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage your personal information and preferences
                                </p>
                            </div>
                            <Button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                variant={isEditing ? "default" : "outline"}
                            >
                                {isEditing ? (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Edit Profile
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Profile Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Personal Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Avatar Section */}
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <Avatar className="w-24 h-24">
                                            <AvatarImage src={user?.imageUrl} />
                                            <AvatarFallback className="text-2xl">
                                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isEditing && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                                            >
                                                <Camera className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-semibold">
                                            {user?.firstName} {user?.lastName}
                                        </h2>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="w-4 h-4" />
                                            {user?.emailAddresses?.[0]?.emailAddress}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Editable Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        {isEditing ? (
                                            <Input
                                                id="firstName"
                                                value={formData.firstName}
                                                onChange={(e) => handleInputChange("firstName", e.target.value)}
                                            />
                                        ) : (
                                            <p className="px-3 py-2 bg-muted rounded-md">
                                                {formData.firstName || "Not set"}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        {isEditing ? (
                                            <Input
                                                id="lastName"
                                                value={formData.lastName}
                                                onChange={(e) => handleInputChange("lastName", e.target.value)}
                                            />
                                        ) : (
                                            <p className="px-3 py-2 bg-muted rounded-md">
                                                {formData.lastName || "Not set"}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="location">Location</Label>
                                        {isEditing ? (
                                            <Input
                                                id="location"
                                                value={formData.location}
                                                onChange={(e) => handleInputChange("location", e.target.value)}
                                                placeholder="City, Country"
                                            />
                                        ) : (
                                            <p className="px-3 py-2 bg-muted rounded-md">
                                                {formData.location || "Not set"}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="website">Website</Label>
                                        {isEditing ? (
                                            <Input
                                                id="website"
                                                value={formData.website}
                                                onChange={(e) => handleInputChange("website", e.target.value)}
                                                placeholder="https://example.com"
                                            />
                                        ) : (
                                            <p className="px-3 py-2 bg-muted rounded-md">
                                                {formData.website || "Not set"}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    {isEditing ? (
                                        <Textarea
                                            id="bio"
                                            value={formData.bio}
                                            onChange={(e) => handleInputChange("bio", e.target.value)}
                                            placeholder="Tell us about yourself..."
                                            className="min-h-[100px]"
                                        />
                                    ) : (
                                        <p className="px-3 py-2 bg-muted rounded-md">
                                            {formData.bio || "No bio provided"}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Account Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Account Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Account Status</p>
                                        <p className="text-sm text-muted-foreground">Your account is active</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        Active
                                    </Badge>
                                </div>
                                
                                <Separator />
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Two-Factor Authentication</p>
                                        <p className="text-sm text-muted-foreground">Secure your account with 2FA</p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        Configure
                                    </Button>
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Privacy Settings</p>
                                        <p className="text-sm text-muted-foreground">Manage your privacy preferences</p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        Manage
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cancel button when editing */}
                        {isEditing && (
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            firstName: user?.firstName || "",
                                            lastName: user?.lastName || "",
                                            bio: "Passionate about creating beautiful and functional user experiences. Love working with cross-functional teams to bring ideas to life.",
                                            location: "San Francisco, CA",
                                            website: "https://example.com"
                                        });
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
            </div>
        </AuthWrapper>
    );
}
