import nodeModuleFs from 'fs'
import nodeModulePath from 'path'
import { promisify } from 'util'

const FILE_TYPE = {
  File: 'File',
  Directory: 'Directory',
  SymbolicLink: 'SymbolicLink',
  Other: 'Other',
  Error: 'Error'
}

const lstatAsync = promisify(nodeModuleFs.lstat)
const mkdirAsync = promisify(nodeModuleFs.mkdir)
const rmdirAsync = promisify(nodeModuleFs.rmdir)
const renameAsync = promisify(nodeModuleFs.rename)
const unlinkAsync = promisify(nodeModuleFs.unlink)
const copyFileAsync = promisify(nodeModuleFs.copyFile) // since 8.5.0

const getPathTypeFromStat = (stat) => stat.isDirectory() ? FILE_TYPE.Directory
  : stat.isFile() ? FILE_TYPE.File
    : stat.isSymbolicLink() ? FILE_TYPE.SymbolicLink
      : FILE_TYPE.Other

const pathTypeError = () => FILE_TYPE.Error

const getPathType = (path) => lstatAsync(path).then(getPathTypeFromStat, pathTypeError)

const createDirectory = async (path, pathType) => {
  if (pathType === undefined) pathType = await getPathType(path)
  if (pathType === FILE_TYPE.Directory) return // directory exist, pass
  if (pathType !== FILE_TYPE.Error) throw new Error('[createDirectory] path already taken by non-directory')

  // check up
  const upperPath = nodeModulePath.dirname(path)
  const upperPathType = await getPathType(upperPath)
  if (upperPathType !== FILE_TYPE.Directory) await createDirectory(upperPath, upperPathType)

  // create directory
  if (pathType !== FILE_TYPE.Directory) await mkdirAsync(path)
}

// NOT recursive operation
const copyPath = async (pathFrom, pathTo, pathType) => {
  if (pathType === undefined) pathType = await getPathType(pathFrom)
  if (await getPathType(pathTo) === pathType && pathType === FILE_TYPE.Directory) {
    __DEV__ && console.log('[copyPath] directory exist, skipped')
    return
  }
  switch (pathType) {
    case FILE_TYPE.File:
    case FILE_TYPE.SymbolicLink:
      return copyFileAsync(pathFrom, pathTo)
    case FILE_TYPE.Directory:
      return mkdirAsync(pathTo)
  }
  throw new Error(`[copyPath] error pathType ${pathType} for ${pathFrom}`)
}
const movePath = async (pathFrom, pathTo, pathType) => {
  if (pathType === undefined) pathType = await getPathType(pathFrom)
  switch (pathType) {
    case FILE_TYPE.File:
    case FILE_TYPE.SymbolicLink:
    case FILE_TYPE.Directory:
      return renameAsync(pathFrom, pathTo)
  }
  throw new Error(`[movePath] error pathType ${pathType} for ${pathFrom}`)
}
const deletePath = async (path, pathType) => {
  if (pathType === undefined) pathType = await getPathType(path)
  switch (pathType) {
    case FILE_TYPE.File:
    case FILE_TYPE.SymbolicLink:
      return unlinkAsync(path)
    case FILE_TYPE.Directory:
      return rmdirAsync(path)
  }
  throw new Error(`[deletePath] error pathType ${pathType} for ${path}`)
}

export {
  FILE_TYPE,

  getPathType,
  createDirectory,

  deletePath,
  movePath,
  copyPath
}
