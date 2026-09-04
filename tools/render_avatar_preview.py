import math
import os
import sys

import bpy
from mathutils import Vector


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return minimum, maximum


def render(model_path, output_dir):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=model_path)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.data.materials]
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    minimum, maximum = bounds(meshes)
    center = (minimum + maximum) / 2
    height = maximum.z - minimum.z

    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (center.x, center.y - height * 2.4, center.z)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = height * 1.18
    look_at(camera, center)
    bpy.context.scene.camera = camera

    world = bpy.context.scene.world or bpy.data.worlds.new("PreviewWorld")
    bpy.context.scene.world = world
    world.color = (0.05, 0.05, 0.05)

    for location, energy, size in [
        ((center.x - height, center.y - height, center.z + height), 1200, height),
        ((center.x + height, center.y - height * 0.5, center.z + height * 0.4), 800, height),
    ]:
        light_data = bpy.data.lights.new("PreviewLight", "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new("PreviewLight", light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, center)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    os.makedirs(output_dir, exist_ok=True)
    for action_name in ("Idle", "Talking"):
        track = next(
            (item for item in armature.animation_data.nla_tracks if item.name == action_name),
            None,
        )
        if track is None:
            raise RuntimeError(f"Missing action: {action_name}")
        for item in armature.animation_data.nla_tracks:
            item.mute = item != track
        action = track.strips[0].action
        scene.frame_set(math.floor(sum(action.frame_range) / 2))
        scene.render.filepath = os.path.join(output_dir, f"male_{action_name.lower()}.png")
        bpy.ops.render.render(write_still=True)


args = sys.argv[sys.argv.index("--") + 1 :]
if len(args) != 2:
    raise SystemExit("Usage: blender --python render_avatar_preview.py -- MODEL OUTPUT_DIR")

render(args[0], args[1])
