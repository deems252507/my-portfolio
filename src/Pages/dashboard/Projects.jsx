import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("FETCH PROJECTS:", { data, error });

      if (error) {
        throw new Error(error.message);
      }

      setProjects(data || []);
    } catch (error) {
      console.error("FETCH PROJECTS ERROR:", error);
      alert("Gagal mengambil project: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const uploadImage = async (file) => {
    if (!file) return "";

    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(fileName, file);

    console.log("UPLOAD IMAGE:", { fileName, uploadError });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    return data?.publicUrl || "";
  };

  const handleCreate = async (form, file) => {
    setUploading(true);

    try {
      let imgUrl = "";

      if (file) {
        imgUrl = await uploadImage(file);
      }

      const projectData = {
        title: form.Title || "",
        description: form.Description || "",
        img: imgUrl,
        tech_stack: form.TechStack
          ? form.TechStack
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        features: form.Features
          ? form.Features
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        link: form.Link || "",
        github: form.Github || "",
      };

      console.log("DATA YANG AKAN DIKIRIM:", projectData);

      const { data, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      console.log("HASIL INSERT:", { data, error });

      if (error) {
        throw new Error(error.message);
      }

      alert("Project berhasil disimpan!");

      setShowCreate(false);

      await fetchProjects();
    } catch (error) {
      console.error("GAGAL SIMPAN PROJECT:", error);
      alert("Gagal menyimpan project: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (form, file) => {
    if (!selectedProject) return;

    setUploading(true);

    try {
      let imgUrl = selectedProject.img || "";

      if (file) {
        imgUrl = await uploadImage(file);
      }

      const projectData = {
        title: form.Title || "",
        description: form.Description || "",
        img: imgUrl,
        tech_stack: form.TechStack
          ? form.TechStack
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        features: form.Features
          ? form.Features
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        link: form.Link || "",
        github: form.Github || "",
      };

      console.log("DATA EDIT:", projectData);

      const { data, error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", selectedProject.id)
        .select()
        .single();

      console.log("HASIL UPDATE:", { data, error });

      if (error) {
        throw new Error(error.message);
      }

      alert("Project berhasil diperbarui!");

      setShowEdit(false);
      setSelectedProject(null);

      await fetchProjects();
    } catch (error) {
      console.error("GAGAL UPDATE PROJECT:", error);
      alert("Gagal memperbarui project: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Yakin ingin menghapus project ini?")) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      console.log("DELETE PROJECT:", { id, error });

      if (error) {
        throw new Error(error.message);
      }

      alert("Project berhasil dihapus!");

      await fetchProjects();
    } catch (error) {
      console.error("GAGAL DELETE PROJECT:", error);
      alert("Gagal menghapus project: " + error.message);
    }
  };

  const ProjectForm = ({ initial, onSubmit, onClose }) => {
    const [form, setForm] = useState({
      Title: initial?.title || "",
      Description: initial?.description || "",
      TechStack: initial?.tech_stack
        ? initial.tech_stack.join(", ")
        : "",
      Features: initial?.features
        ? initial.features.join(", ")
        : "",
      Link: initial?.link || "",
      Github: initial?.github || "",
    });

    const [file, setFile] = useState(null);

    const handleChange = (e) => {
      const { name, value } = e.target;

      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(form, file);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {initial ? "Edit Project" : "Tambah Project"}
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="text-2xl text-gray-500 hover:text-gray-900"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Title
              </label>

              <input
                type="text"
                name="Title"
                value={form.Title}
                onChange={handleChange}
                required
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>

              <textarea
                name="Description"
                value={form.Description}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Tech Stack
              </label>

              <input
                type="text"
                name="TechStack"
                value={form.TechStack}
                onChange={handleChange}
                placeholder="HTML, CSS, JavaScript"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Features
              </label>

              <input
                type="text"
                name="Features"
                value={form.Features}
                onChange={handleChange}
                placeholder="Responsive, Dashboard, Authentication"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Link
              </label>

              <input
                type="text"
                name="Link"
                value={form.Link}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Github
              </label>

              <input
                type="text"
                name="Github"
                value={form.Github}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Project Image
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border px-4 py-2"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
              >
                {uploading ? "Menyimpan..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ProjectCard = ({ project }) => {
    return (
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        {project.img && (
          <img
            src={project.img}
            alt={project.title}
            className="h-48 w-full object-cover"
          />
        )}

        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900">
            {project.title}
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            {project.description}
          </p>

          {project.tech_stack?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech_stack.map((tech, index) => (
                <span
                  key={index}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => {
                setSelectedProject(project);
                setShowEdit(true);
              }}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Edit
            </button>

            <button
              onClick={() => deleteProject(project.id)}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Projects
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Kelola project portfolio Anda.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
        >
          + Tambah Project
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500">
          Loading...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          Belum ada project.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <ProjectForm
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showEdit && selectedProject && (
        <ProjectForm
          initial={selectedProject}
          onSubmit={handleEdit}
          onClose={() => {
            setShowEdit(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
};

export default Projects;
