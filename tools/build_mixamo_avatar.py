import os
import sys

import bpy
from io_scene_fbx import import_fbx


_original_read_light = import_fbx.blen_read_light


def read_light_without_legacy_cycles_shadow(*args, **kwargs):
    try:
        return _original_read_light(*args, **kwargs)
    except AttributeError as error:
        if "cast_shadow" not in str(error) or not bpy.data.lights:
            raise
        return bpy.data.lights[-1]


import_fbx.blen_read_light = read_light_without_legacy_cycles_shadow


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def import_fbx(path):
    before_objects = set(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=path, use_anim=True)
    objects = [obj for obj in bpy.context.scene.objects if obj not in before_objects]
    actions = [action for action in bpy.data.actions if action not in before_actions]
    armature = next(obj for obj in objects if obj.type == "ARMATURE")
    mesh = next(obj for obj in objects if obj.type == "MESH")
    action = armature.animation_data.action if armature.animation_data else None
    if action is None and actions:
        action = actions[0]
    if action is None:
        raise RuntimeError(f"No animation action found in {path}")
    return objects, armature, mesh, action


def add_action_track(armature, action, name):
    action.name = name
    armature.animation_data_create()
    armature.animation_data.action = action
    track = armature.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, int(action.frame_range[0]), action)
    strip.name = name
    armature.animation_data.action = None


def remove_objects(objects):
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)


def select_export_objects(armature, mesh):
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = armature


def build(idle_path, talking_path, output_path, asset_name):
    reset_scene()

    idle_objects, armature, mesh, idle_action = import_fbx(idle_path)
    armature.name = f"{asset_name}_Rig"
    armature.data.name = f"{asset_name}_Rig"
    mesh.name = f"{asset_name}_Mesh"
    mesh.data.name = f"{asset_name}_Mesh"
    add_action_track(armature, idle_action, "Idle")

    talking_objects, talking_armature, _talking_mesh, talking_action = import_fbx(talking_path)
    if [bone.name for bone in armature.data.bones] != [bone.name for bone in talking_armature.data.bones]:
        raise RuntimeError("Idle and Talking armatures do not have identical bone hierarchies")

    add_action_track(armature, talking_action, "Talking")
    remove_objects(talking_objects)

    for obj in list(idle_objects):
        if obj not in {armature, mesh}:
            bpy.data.objects.remove(obj, do_unlink=True)

    mesh.parent = armature
    for modifier in mesh.modifiers:
        if modifier.type == "ARMATURE":
            modifier.object = armature

    select_export_objects(armature, mesh)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_materials="EXPORT",
        export_yup=True,
    )

    print(
        "AVATAR_BUILD="
        + str(
            {
                "output": output_path,
                "mesh_polygons": len(mesh.data.polygons),
                "bones": len(armature.data.bones),
                "animations": [track.name for track in armature.animation_data.nla_tracks],
            }
        )
    )


args = sys.argv[sys.argv.index("--") + 1 :]
if len(args) != 4:
    raise SystemExit("Usage: blender --python build_mixamo_avatar.py -- IDLE TALKING OUTPUT ASSET_NAME")

build(args[0], args[1], args[2], args[3])
